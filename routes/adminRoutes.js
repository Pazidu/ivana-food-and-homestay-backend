import express from "express";
import { connectToDatabase } from "../lib/db.js";
import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const bucket = admin.storage().bucket();

// ================= Menu Routes =================

// Get all menu items (Admin)
router.get("/menu", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM menu");
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add a new menu item
router.post("/menu", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { name, type, regular_price, large_price, image_link } = req.body;

    const [result] = await db.query(
      "INSERT INTO menu (name, type, regular_price, large_price, image_link) VALUES (?, ?, ?, ?, ?)",
      [name, type, regular_price, large_price, image_link]
    );

    res.json({
      id: result.insertId,
      name,
      type,
      regular_price,
      large_price,
      image_link,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to add menu item", details: err.message });
  }
});

// Upload image to Firebase
router.post("/menu/upload-image", upload.single("image"), async (req, res) => {
  try {
    const localFilePath = req.file.path;
    const destination = `menu-images/${Date.now()}-${req.file.originalname}`;

    const [file] = await bucket.upload(localFilePath, {
      destination,
      metadata: { contentType: req.file.mimetype },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

    fs.unlinkSync(localFilePath); // delete local temp file
    res.json({ url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit menu item
router.put("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { name, type, regular_price, large_price, image_link } = req.body;

    await db.query(
      "UPDATE menu SET name=?, type=?, regular_price=?, large_price=?, image_link=? WHERE id=?",
      [name, type, regular_price, large_price, image_link, id]
    );

    const [updatedRows] = await db.query("SELECT * FROM menu WHERE id=?", [id]);
    res.json(updatedRows[0]);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update menu item", details: err.message });
  }
});

// Delete menu item
router.delete("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM menu WHERE id=?", [id]);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Hide/unhide menu item
router.put("/menu/hide/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { hide } = req.body;

    await db.query("UPDATE menu SET is_hidden=? WHERE id=?", [hide, id]);
    const [rows] = await db.query("SELECT * FROM menu WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ================= Users Routes =================

// Get all users
router.get("/users", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add new user
router.post("/users", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { username, email, address, city, phone, user_type } = req.body;
    const [result] = await db.query(
      "INSERT INTO users (username, email, address, city, phone, user_type) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, address, city, phone, user_type]
    );
    res.json({
      id: result.insertId,
      username,
      email,
      address,
      city,
      phone,
      user_type,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Update only user_type
router.put("/users/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { user_type } = req.body;

    if (!user_type)
      return res.status(400).json({ error: "user_type is required" });

    await db.query("UPDATE users SET user_type=? WHERE id=?", [user_type, id]);
    const [rows] = await db.query("SELECT * FROM users WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id=?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// ================= Bookings Routes =================

// Get all bookings
router.get("/bookings", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(`
      SELECT 
        b.id,
        b.guestName,
        b.guestEmail,
        b.guestPhone,
        r.type AS room_type,
        b.checkIn,
        b.checkOut,
        b.created_at
      FROM bookings b
      JOIN rooms r ON b.roomId = r.id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Delete booking
router.delete("/bookings/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM bookings WHERE id=?", [id]);
    res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// ================= Gallery Routes =================

// Add new gallery image (pending by default)
router.post("/gallery/add", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, type } = req.body; // type = "foods" or "homestay"
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = `${type}-gallery/${Date.now()}_${file.originalname}`;
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: file.mimetype },
    });

    blobStream.on("error", (err) => {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    });

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic(); // 🔹 Make file public

        const db = await connectToDatabase();
        const [result] = await db.query(
          "INSERT INTO foods_gallery (name, phone, image_link, type, status) VALUES (?, ?, ?, ?, 'pending')",
          [name, phone, filePath, type]
        );

        res.json({
          message: "Image uploaded successfully",
          id: result.insertId,
          name,
          phone,
          type,
          image_link: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
          status: "pending",
        });
      } catch (err) {
        console.error("Firebase public error:", err);
        res
          .status(500)
          .json({ error: "Failed to make file public", details: err.message });
      }
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to upload image", details: err.message });
  }
});

// 🔹 Get pending images
router.get("/gallery/pending", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='pending' ORDER BY id DESC"
    );

    const urls = rows.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      type: item.type,
      status: item.status,
      image_link: `https://storage.googleapis.com/${bucket.name}/${item.image_link}`,
    }));

    res.json(urls);
  } catch (err) {
    console.error("Pending fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get approved images
router.get("/gallery/approved", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='approved' ORDER BY id DESC"
    );

    const urls = rows.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      type: item.type,
      status: item.status,
      image_link: `https://storage.googleapis.com/${bucket.name}/${item.image_link}`,
    }));

    res.json(urls);
  } catch (err) {
    console.error("Approved fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Approve an image
router.put("/gallery/:id/approve", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("UPDATE foods_gallery SET status='approved' WHERE id=?", [
      id,
    ]);
    res.json({ message: "Image approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decline an image
router.put("/gallery/:id/reject", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("UPDATE foods_gallery SET status='rejected' WHERE id=?", [
      id,
    ]);
    res.json({ message: "Image declined" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete image
router.delete("/gallery/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT image_link FROM foods_gallery WHERE id=?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Image not found" });

    const filePath = rows[0].image_link;
    await bucket.file(filePath).delete();
    await db.query("DELETE FROM foods_gallery WHERE id=?", [id]);

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
