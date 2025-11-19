// routes/galleryRoutes.js
import express from "express";
import multer from "multer";
import admin from "../Firebase/admin.js";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();
const bucket = admin.storage().bucket("contra-cloud.firebasestorage.app");
console.log("Firebase Bucket:", bucket.name);

const upload = multer({ storage: multer.memoryStorage() });

//  GET Approved Images (Users)
router.get("/gallery", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='approved' ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Gallery fetch error:", err);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

//  GET Pending Images (Admin)
router.get("/gallery/pending", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='pending' ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Pending fetch error:", err);
    res.status(500).json({ error: "Failed to fetch pending gallery" });
  }
});

//  GET Approved Images (Admin)
router.get("/gallery/approved", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='approved' ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Approved fetch error:", err);
    res.status(500).json({ error: "Failed to fetch approved gallery" });
  }
});

//  ADMIN UPLOAD
router.post("/gallery/admin/add", upload.single("image"), async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = `admin-gallery/${Date.now()}_${file.originalname}`;
    const blob = bucket.file(filePath);

    await blob.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    // 🔥 Make file public
    await blob.makePublic();

    // 🔥 Guaranteed working public URL
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    const db = await connectToDatabase();
    await db.query(
      "INSERT INTO foods_gallery (name, phone, type, image_link, status) VALUES (?, ?, ?, ?, 'approved')",
      ["Admin Upload", "0000000000", type, imageUrl]
    );

    res.json({ message: "Admin upload successful", imageUrl, type });
  } catch (err) {
    console.error("Admin upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

//  DELETE IMAGE
router.delete("/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectToDatabase();

    // Check if the record exists
    const [rows] = await db.query("SELECT * FROM foods_gallery WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete the record only from MySQL
    await db.query("DELETE FROM foods_gallery WHERE id = ?", [id]);

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
