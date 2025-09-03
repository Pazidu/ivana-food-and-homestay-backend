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

// Delete review
router.delete("/foods/reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // const db = await connectToDatabase();
    await db.query("DELETE FROM reviews WHERE id = ?", [id]);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET all complaints
router.get("/foods/complaints", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM complaints");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
});

//POST a new complaint
router.post("/foods/complaints", async (req, res) => {
  try {
    console.log("Body received:", req.body); // debug
    const { name, comment } = req.body;

    if (!name || !comment) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await db.query(
      "INSERT INTO complaints (name, comment) VALUES (?, ?)",
      [name, comment]
    );

    res.status(201).json({
      message: "Complaint added successfully",
      complaint: {
        id: result.insertId,
        user: name,
        comment,
      },
    });
  } catch (error) {
    console.error("Error adding complaint:", error);
    res
      .status(500)
      .json({ message: "Failed to add complaint", error: error.message });
  }
});

// Delete complaint
router.delete("/foods/complaints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // const db = await connectToDatabase();
    await db.query("DELETE FROM complaints WHERE id = ?", [id]);
    res.json({ message: "Complaint deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
