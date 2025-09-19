// routes/authRoutes.js
import express from "express";
import { connectToDatabase } from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import passport from "passport";

const router = express.Router();
let otpStore = {}; // { email: { otp, expiresAt } }

// ================== GOOGLE LOGIN ==================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const db = await connectToDatabase();
      const email = req.user.email;
      const username = req.user.name;

      const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);

      let userId;
      let isNew = false;

      if (rows.length === 0) {
        const [result] = await db.query(
          "INSERT INTO users (username, email, user_type, verified, isNew) VALUES (?, ?, 'user', 1, 1)",
          [username, email]
        );
        userId = result.insertId;
        isNew = true;
      } else {
        userId = rows[0].id;
        isNew = rows[0].isNew === 1;
      }

      const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      if (isNew) {
        return res.redirect(
          `http://localhost:5173/google-form?token=${token}&email=${email}`
        );
      }

      res.redirect(
        `http://localhost:5173?token=${token}&username=${username}&role=user&id=${userId}`
      );
    } catch (err) {
      console.error("Google login error:", err);
      res.redirect("/login?error=server");
    }
  }
);

// ================== SAVE EXTRA GOOGLE DETAILS ==================
router.post("/google-details", async (req, res) => {
  const { email, fullName, phone, address, city } = req.body;

  try {
    const db = await connectToDatabase();
    await db.query(
      "UPDATE users SET username=?, phone=?, address=?, city=?, isNew=0 WHERE email=?",
      [fullName, phone, address, city, email]
    );

    res
      .status(200)
      .json({ success: true, message: "Details saved successfully" });
  } catch (err) {
    console.error("Error saving Google user details:", err);
    res.status(500).json({ success: false, error: "Failed to save details" });
  }
});

// ================== EMAIL SIGNUP ==================
router.post("/signup", async (req, res) => {
  const { username, email, address, city, phone, password, confirmPassword } =
    req.body;

  try {
    const db = await connectToDatabase();

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, email, address, city, phone, password, user_type, verified, isNew) VALUES (?, ?, ?, ?, ?, ?, 'user', 0, 0)",
      [username, email, address, city, phone, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== EMAIL LOGIN ==================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = await connectToDatabase();
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(201).json({
      token,
      id: rows[0].id,
      username: rows[0].username,
      email: rows[0].email,
      address: rows[0].address,
      city: rows[0].city,
      phone: rows[0].phone,
      user_type: rows[0].user_type,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== TOKEN VERIFY ==================
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(403).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// ================== PROFILE ==================
router.get("/user/profile", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      req.userId,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/user/profile", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { username, email, address, city, phone } = req.body;

    await db.query(
      "UPDATE users SET username=?, email=?, address=?, city=?, phone=? WHERE id=?",
      [username, email, address, city, phone, req.userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ================== OTP ROUTES ==================

// Setup transporter (configure env variables for Gmail or SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // valid 5 mins

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ================== VERIFY OTP ==================
router.post("/verify-otp", async (req, res) => {
  const { email, otp, purpose } = req.body;

  // 1️⃣ Validate request body
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  if (!otpStore[email]) {
    return res
      .status(400)
      .json({ error: "No OTP request found for this email" });
  }

  const { otp: storedOtp, expiresAt } = otpStore[email];

  // 2️⃣ Check expiration
  if (Date.now() > expiresAt) {
    delete otpStore[email];
    return res
      .status(400)
      .json({ error: "OTP expired. Please request a new one." });
  }

  // 3️⃣ Check OTP match
  if (otp.toString() !== storedOtp.toString()) {
    return res
      .status(400)
      .json({ error: "Invalid OTP. Please check and try again." });
  }

  // ✅ OTP is correct → remove from store
  delete otpStore[email];

  // Optional: use the purpose if needed for logging or different flows
  console.log(
    `OTP verified for ${email} with purpose: ${purpose || "general"}`
  );

  return res.json({ success: true, message: "OTP verified successfully" });
});

// ================== RESET PASSWORD ==================
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ error: "Email and new password are required" });
  }

  try {
    const db = await connectToDatabase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.query(
      "UPDATE users SET password=? WHERE email=?",
      [hashedPassword, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
