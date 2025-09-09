import express from "express";
import { connectToDatabase } from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();
let otpStore = {};

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
      "INSERT INTO users (username, email, address, city, phone, password) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, address, city, phone, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(201).json({
      token: token,
      id: rows[0].id,
      username: rows[0].username,
      email: rows[0].email,
      address: rows[0].address,
      city: rows[0].city,
      phone: rows[0].phone,
      user_type: rows[0].user_type,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(403).json({ error: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

router.get("/user/profile", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase();

    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      req.userId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-otp", async (req, res) => {
  const { email, purpose } = req.body; // purpose = "verifyEmail" | "resetPassword"

  try {
    // Only check DB for password reset
    if (purpose === "resetPassword") {
      const db = await connectToDatabase();
      const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, purpose, timestamp: Date.now() };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "pasidubhagya20@gmail.com",
        pass: process.env.APP_PASSWORD,
      },
    });

    const subject =
      purpose === "verifyEmail" ? "Verify Your Email" : "Password Reset OTP";

    await transporter.sendMail({
      from: "pasidubhagya20@gmail.com",
      to: email,
      subject,
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2️⃣ Unified Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp, purpose } = req.body;
  const db = await connectToDatabase();

  try {
    if (
      otpStore[email] &&
      otpStore[email].otp === otp &&
      otpStore[email].purpose === purpose
    ) {
      if (purpose === "verifyEmail") {
        // ✅ mark user as verified
        await db.query("UPDATE users SET verified = 1 WHERE email = ?", [
          email,
        ]);
      }

      delete otpStore[email]; // clear OTP after use
      res.json({ success: true, message: "OTP verified successfully" });
    } else {
      res.json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3️⃣ Reset Password
router.post("/reset-password", async (req, res) => {
  const db = await connectToDatabase();
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    delete otpStore[email]; // clear OTP after success

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
