// index.js
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import admin from "./Firebase/admin.js"; // ✅ Use centralized Firebase init
import bodyParser from "body-parser";

import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookingsRoutes from "./routes/bookingRoutes.js";
import roomsRoutes from "./routes/roomsRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";

import { connectToDatabase } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
      };
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Google Auth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      "jwt-secret",
      { expiresIn: "1h" }
    );
    res.redirect(`http://localhost:5173?token=${token}`);
  }
);

// Attach Routers
app.use("/auth", authRouter);
app.use("/api", reviewRouter);
app.use("/api", adminRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api", menuRoutes);
app.use("/api", galleryRoutes);

// Catch-all
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Test DB Connection
(async () => {
  try {
    await connectToDatabase();
    console.log("✅ MySQL pool created (server start check)");
  } catch (err) {
    console.error("❌ Failed to create MySQL pool:", err.message);
  }
})();

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
