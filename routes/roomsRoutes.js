import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// GET all rooms
router.get("/", async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const [rows] = await pool.query("SELECT * FROM rooms");
    // Convert facilities string to array
    const rooms = rows.map((r) => ({
      ...r,
      facilities: r.facilities.split(","),
    }));
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

export default router;
