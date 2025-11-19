import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// Get menu items for users
router.get("/foods/menu", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { type } = req.query;
    const [results] = await db.query(
      "SELECT * FROM menu WHERE type = ? AND is_hidden = 0",
      [type]
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

export default router;
