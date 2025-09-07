// index.js
import express from "express";
import cors from "cors";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import { connectToDatabase } from "./lib/db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Attach routers
app.use("/auth", authRouter);
app.use("/api", reviewRouter);
app.use("/api", adminRouter);

// ✅ Example menu route
app.get("/api/foods/menu", async (req, res) => {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: "Missing 'type' query parameter" });
  }

  try {
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM menu WHERE type = ?", [
      type,
    ]);
    res.json(results);
  } catch (err) {
    console.error("Menu DB error:", err.message, err.stack);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

(async () => {
  try {
    const db = await connectToDatabase();
    console.log("✅ MySQL pool created (server start check)");
  } catch (err) {
    console.error("❌ Failed to create MySQL pool:", err.message);
  }
})();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
