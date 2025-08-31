import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

// Connect to MySQL
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ivana",
});

// GET all reviews
router.get("/foods/reviews", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM reviews");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// POST a new review
router.post("/foods/reviews", async (req, res) => {
  try {
    console.log("Body received:", req.body); // debug
    const { name, comment, rating } = req.body;

    if (!name || !comment || !rating) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const numericRating = Number(rating);

    const [result] = await db.query(
      "INSERT INTO reviews (name, comment, rating) VALUES (?, ?, ?)",
      [name, comment, numericRating]
    );

    res.status(201).json({
      message: "Review added successfully",
      review: {
        id: result.insertId,
        user: name,
        comment,
        rating: numericRating,
      },
    });
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ message: "Failed to add review", error: error.message });
  }
});

export default router;
