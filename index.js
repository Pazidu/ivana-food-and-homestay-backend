import express from "express";
import cors from "cors";
import mysql from "mysql2";
import authRouter from "./routes/authRoutes.js";
// import db from "./lib/db.js";

const app = express();
app.use(cors());
app.use(express.json());

const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ivana",
});

app.get("/api/foods/menu", (req, res) => {
  const { type } = req.query; // Read ?type=...

  db.query(`SELECT * FROM menu WHERE type = ?`, [type], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
