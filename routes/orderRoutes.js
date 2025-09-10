import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// Create new order
router.post("/", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { userName, address, phone, items, totalPrice } = req.body;

    const sql =
      "INSERT INTO orders (userName, address, phone, items, totalPrice) VALUES (?, ?, ?, ?, ?)";
    const [result] = await db.query(sql, [
      userName,
      address,
      phone,
      JSON.stringify(items),
      totalPrice,
    ]);

    res.status(201).json({
      id: result.insertId,
      userName,
      address,
      phone,
      items,
      totalPrice,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sql = "SELECT * FROM orders ORDER BY createdAt DESC";
    const [rows] = await db.query(sql);

    rows.forEach((row) => {
      row.items = JSON.parse(row.items);
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sql = "DELETE FROM orders WHERE id = ?";
    await db.query(sql, [req.params.id]);

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
