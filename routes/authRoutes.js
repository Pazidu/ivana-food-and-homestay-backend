import express from "express";
import { connectToDatabase } from "../lib/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

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

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    return res.status(201).json({ token: token });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers("authorization").split(" ")[1];
    if (!token) {
      return res.status(403).json({ error: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

router.get("/user/foods/home", verifyToken, async (req, res) => {
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

export default router;
