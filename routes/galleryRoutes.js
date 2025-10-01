// routes/galleryRoutes.js
import express from "express";
import multer from "multer";
import admin from "../Firebase/admin.js";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();
const bucket = admin.storage().bucket();
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 Get full gallery (only approved for users)
router.get("/gallery", async (req, res) => {
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
    console.error("Gallery fetch error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch gallery", details: err.message });
  }
});

// 🔹 Upload image (pending by default)
router.post("/gallery/add", upload.single("image"), async (req, res) => {
  try {
    const { name, phone, type } = req.body;
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
        await blob.makePublic(); // 🔹 Make file publicly accessible

        const db = await connectToDatabase();
        const [result] = await db.query(
          "INSERT INTO foods_gallery (name, phone, type, image_link, status) VALUES (?, ?, ?, ?, 'pending')",
          [name, phone, type, filePath]
        );

        res.json({
          message: "Image uploaded successfully (waiting for admin approval)",
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
    console.error("Upload error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to upload image", details: err.message });
  }
});

export default router;
