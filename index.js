import express from "express";
import cors from "cors";
import mysql from "mysql2";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);
app.use("/api", reviewRouter);

// ✅ Database connection
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ivana",
});

// ✅ Menu route (already there)
app.get("/api/foods/menu", (req, res) => {
  const { type } = req.query; // ?type=...
  db.query(`SELECT * FROM menu WHERE type = ?`, [type], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ Get all reviews
app.get("/api/foods/reviews", (req, res) => {
  db.query("SELECT * FROM reviews", (err, results) => {
    if (err) {
      console.error("Error fetching reviews:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ Add a new review
app.post("/api/foods/reviews", (req, res) => {
  const { name, comment, rating } = req.body;

  if (!name || !comment || !rating) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "INSERT INTO reviews (name, comment, rating) VALUES (?, ?, ?)",
    [name, comment, rating],
    (err, result) => {
      if (err) {
        console.error("Error adding review:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        message: "Review added successfully",
        review: { id: result.insertId, name, comment, rating },
      });
    }
  );
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
