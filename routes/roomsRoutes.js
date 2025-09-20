import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// GET all rooms
router.get("/all", async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const [rows] = await pool.query("SELECT * FROM rooms");
    const rooms = rows.map((r) => ({
      ...r,
      facilities: r.facilities ? r.facilities.split(",") : [],
    }));
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

// GET rooms availability
router.get("/", async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "Missing check-in or check-out dates" });
    }

    const [rooms] = await pool.query("SELECT * FROM rooms");

    const roomsWithAvailability = await Promise.all(
      rooms.map(async (room) => {
        const [bookings] = await pool.query(
          `SELECT COUNT(*) AS bookedCount 
           FROM bookings 
           WHERE roomId = ? 
           AND NOT (checkOut < ? OR checkIn > ?);`,
          [room.id, checkIn, checkOut]
        );

        const bookedCount = bookings[0].bookedCount;

        return {
          ...room,
          available: room.total_rooms - bookedCount,
          facilities: room.facilities ? room.facilities.split(",") : [],
        };
      })
    );

    res.json({ rooms: roomsWithAvailability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
