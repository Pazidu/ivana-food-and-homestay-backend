// routes/reviewsRoutes.js
import express from "express";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();

// GET all reviews
router.get("/foods/reviews", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM reviews ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// POST a new review
router.post("/foods/reviews", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { name, comment, rating } = req.body;

    if (!name || !comment || !rating) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: "Name too long (max 100 chars)" });
    }
    if (comment.length > 500) {
      return res
        .status(400)
        .json({ message: "Comment too long (max 500 chars)" });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const [result] = await db.query(
      "INSERT INTO reviews (name, comment, rating) VALUES (?, ?, ?)",
      [name, comment, numericRating]
    );

    res.status(201).json({
      message: "Review added successfully",
      review: { id: result.insertId, name, comment, rating: numericRating },
    });
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ message: "Failed to add review", error: error.message });
  }
});

// DELETE a review
router.delete("/foods/reviews/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM reviews WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res
      .status(500)
      .json({ message: "Failed to delete review", error: error.message });
  }
});


// GET all complaints
router.get("/foods/complaints", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query("SELECT * FROM complaints");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch complaints", error: error.message });
  }
});

// POST a new complaint
router.post("/foods/complaints", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { name, comment } = req.body;

    if (!name || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: "Name too long (max 100 chars)" });
    }
    if (comment.length > 500) {
      return res
        .status(400)
        .json({ message: "Comment too long (max 500 chars)" });
    }

    const [result] = await db.query(
      "INSERT INTO complaints (name, comment) VALUES (?, ?)",
      [name, comment]
    );

    res.status(201).json({
      message: "Complaint added successfully",
      complaint: { id: result.insertId, name, comment },
    });
  } catch (error) {
    console.error("Error adding complaint:", error);
    res
      .status(500)
      .json({ message: "Failed to add complaint", error: error.message });
  }
});

// DELETE a complaint
router.delete("/foods/complaints/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM complaints WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    res
      .status(500)
      .json({ message: "Failed to delete complaint", error: error.message });
  }
});

router.get("/test", (req, res) => {
  res.json({ message: "reviewsRoutes is working ✅" });
});

export default router;
