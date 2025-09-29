import express from "express";
import { connectToDatabase } from "../lib/db.js"; // ✅ use shared db
import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

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
// Get menu items for users (only visible)
// router.get("/menu", async (req, res) => {
//   try {
//     const db = await connectToDatabase();
//     const { type } = req.query;
//     const [results] = await db.query(
//       "SELECT * FROM menu WHERE type = ? AND is_hidden = 0",
//       [type]
//     );
//     res.json(results);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch menu items" });
//   }
// });

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
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to add menu item", details: err.message });
  }
});

// Upload image to Firebase
router.post("/menu/upload-image", upload.single("image"), async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    const localFilePath = req.file.path;
    const destination = `menu-images/${Date.now()}-${req.file.originalname}`;

    const [file] = await bucket.upload(localFilePath, {
      destination,
      metadata: { contentType: req.file.mimetype },
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

    // Delete local temp file
    fs.unlinkSync(localFilePath);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("Firebase upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete menu item
router.delete("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM menu WHERE id = ?", [id]);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Edit menu item
router.put("/menu/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { name, type, regular_price, large_price, image_link } = req.body;

    // Get old image_link
    const [rows] = await db.query("SELECT image_link FROM menu WHERE id=?", [
      id,
    ]);
    const oldImageLink = rows[0]?.image_link;

    await db.query(
      "UPDATE menu SET name=?, type=?, regular_price=?, large_price=?, image_link=? WHERE id=?",
      [name, type, regular_price, large_price, image_link, id]
    );

    // Optional: delete old image from Supabase if a new one is uploaded
    if (image_link && oldImageLink && image_link !== oldImageLink) {
      try {
        // Extract path inside bucket from URL
        const oldPath = oldImageLink.split(
          ".supabase.co/storage/v1/object/public/"
        )[1];
        if (oldPath) {
          await supabase.storage.from("public").remove([oldPath]);
        }
      } catch (err) {
        console.error("Failed to delete old image from Supabase:", err.message);
      }
    }

    const [updatedRows] = await db.query("SELECT * FROM menu WHERE id=?", [id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to update menu item", details: err.message });
  }
});

// Hide/unhide menu item
router.put("/menu/hide/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { hide } = req.body; // expect { hide: true/false }

    await db.query("UPDATE menu SET is_hidden=? WHERE id=?", [hide, id]);

    const [rows] = await db.query("SELECT * FROM menu WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
});
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

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

// ✅ Get all bookings
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
    console.error("Error fetching bookings:", err.message);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ✅ Delete booking
router.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectToDatabase();
    await db.query("DELETE FROM bookings WHERE id = ?", [id]);
    res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// Update only user_type
router.put("/users/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;
    const { user_type } = req.body;

    if (!user_type) {
      return res.status(400).json({ error: "user_type is required" });
    }

    await db.query("UPDATE users SET user_type=? WHERE id=?", [user_type, id]);

    const [rows] = await db.query("SELECT * FROM users WHERE id=?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.get("/test-upload", async (req, res) => {
  try {
    const bucket = admin.storage().bucket();

    // Path to your local image
    const localFilePath = path.join(process.cwd(), "test", "test.png");
    const destination = `uploads/sample-image-${Date.now()}.png`;

    // Upload image
    const [file] = await bucket.upload(localFilePath, {
      destination,
      metadata: {
        contentType: "image/png",
      },
    });

    // Make the file public
    await file.makePublic();

    // Public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

    res.json({
      message: "Image uploaded successfully",
      url: publicUrl,
    });
  } catch (err) {
    console.error("Firebase upload error:", err);
    res
      .status(500)
      .json({ error: "Firebase upload failed", details: err.message });
  }
});

export default router;
