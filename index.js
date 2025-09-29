// index.js
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import admin from "firebase-admin";
import serviceAccount from "./contra-cloud-firebase-adminsdk-ow8ha-7792acf400.json" assert { type: "json" };

import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookingsRoutes from "./routes/bookingRoutes.js";
import roomsRoutes from "./routes/roomsRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";

import bodyParser from "body-parser";
import { connectToDatabase } from "./lib/db.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // ✅ Adjust frontend port
app.use(bodyParser.json());

// ✅ Session middleware (needed for Passport)
app.use(
  session({
    secret: "your-secret-key", // change to strong secret
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "contra-cloud.firebasestorage.app",
});

// 🔹 Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // from Google Cloud
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      // Here you can save user to DB if needed
      const user = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
      };
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// ✅ Google Login Route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// ✅ Google Callback Route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Generate JWT for frontend
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      "jwt-secret", // replace with process.env.JWT_SECRET
      { expiresIn: "1h" }
    );

    // Redirect frontend with token
    res.redirect(`http://localhost:5173?token=${token}`);
  }
);

// // ✅ Menu route
// app.get("/api/foods/menu", async (req, res) => {
//   const { type } = req.query;
//   if (!type)
//     return res.status(400).json({ error: "Missing 'type' query parameter" });

//   try {
//     // const db = await connectToDatabase();
//     const [results] = await db.query("SELECT * FROM menu WHERE type = ?", [
//       type,
//     ]);
//     res.json(results);
//   } catch (err) {
//     console.error("Menu DB error:", err.message);
//     res.status(500).json({ error: "Database error", details: err.message });
//   }
// });

// ✅ Attach other routers AFTER cart/menu routes
app.use("/auth", authRouter);
app.use("/api", reviewRouter);
app.use("/api", adminRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api", menuRoutes);

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Test DB connection on server start
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
