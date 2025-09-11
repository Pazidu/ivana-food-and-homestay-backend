import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// Get user info by ID
router.get("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      address: user.address,
      phone: user.phone,
      user_type: user.user_type,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
