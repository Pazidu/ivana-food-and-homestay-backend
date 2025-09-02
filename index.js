import express from "express";
import cors from "cors";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import { connectToDatabase } from "./lib/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRouter);
app.use("/api", reviewRouter);
app.use("/api", adminRouter);

app.get("/api/foods/menu", async (req, res) => {
  try {
    const { type } = req.query;
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM menu WHERE type = ?", [
      type,
    ]);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
