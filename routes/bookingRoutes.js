import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// GET all rooms with availability
router.get("/", async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const { checkIn, checkOut } = req.query;

    const [rooms] = await pool.query("SELECT * FROM rooms");

    const roomsWithAvailability = await Promise.all(
      rooms.map(async (room) => {
        let bookedCount = 0;

        if (checkIn && checkOut) {
          const [bookings] = await pool.query(
            `SELECT COUNT(*) AS bookedCount
             FROM bookings
             WHERE roomId = ?
             AND (checkIn <= ? AND checkOut >= ?)`,
            [room.id, checkOut, checkIn]
          );
          bookedCount = bookings[0].bookedCount;
        }

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

// POST new booking
router.post("/", async (req, res) => {
  const { roomId, checkIn, checkOut, guestName, guestEmail, guestPhone } =
    req.body;

  if (
    !roomId ||
    !checkIn ||
    !checkOut ||
    !guestName ||
    !guestEmail ||
    !guestPhone
  ) {
    return res.status(400).json({ message: "Missing booking details" });
  }

  try {
    const pool = await connectToDatabase();

    // Insert new booking
    const [result] = await pool.query(
      "INSERT INTO bookings (roomId, guestName, guestEmail, guestPhone, checkIn, checkOut) VALUES (?, ?, ?, ?, ?, ?)",
      [roomId, guestName, guestEmail, guestPhone, checkIn, checkOut]
    );

    res
      .status(201)
      .json({ message: "Booking successful", bookingId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all bookings (for calendar)
router.get("/all", async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const [bookings] = await pool.query("SELECT * FROM bookings");
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
