import express from "express";
import { connectToDatabase } from "../lib/db.js"; // ✅ use shared db

const router = express.Router();

// Get all menu items
router.get("/menu", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM menu");
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add a new menu item
router.post("/menu", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { name, type, regular_price, large_price, image_link } = req.body;
    const [result] = await db.query(
      "INSERT INTO menu (name, type, regular_price, large_price, image_link) VALUES (?, ?, ?, ?, ?)",
      [name, type, regular_price, large_price, image_link]
    );
    res.json({
      id: result.insertId,
      name,
      type,
      regular_price,
      large_price,
      image_link,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete menu item
router.delete("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM menu WHERE id = ?", [id]);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Edit menu item
router.put("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { name, type, regular_price, large_price, image_link } = req.body;
    await db.query(
      "UPDATE menu SET name=?, type=?, regular_price=?, large_price=?, image_link=? WHERE id=?",
      [name, type, regular_price, large_price, image_link, id]
    );
    const [rows] = await db.query("SELECT * FROM menu WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get all users
router.get("/users", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add new user
router.post("/users", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { username, email, address, city, phone } = req.body;
    const [result] = await db.query(
      "INSERT INTO users (username, email, address, city, phone) VALUES (?, ?, ?, ?, ?)",
      [username, email, address, city, phone]
    );
    res.json({ id: result.insertId, username, email, address, city, phone });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
