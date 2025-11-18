// routes/galleryRoutes.js
import express from "express";
import multer from "multer";
import admin from "../Firebase/admin.js";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();
const bucket = admin.storage().bucket("contra-cloud.appspot.com");
console.log("Your Firebase Bucket Name:", bucket.name);
const upload = multer({ storage: multer.memoryStorage() });

/* --------------------------------------------------------
   GET Approved Images (Users)
--------------------------------------------------------- */
router.get("/gallery", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const [rows] = await db.query(
      "SELECT * FROM foods_gallery WHERE status='approved' ORDER BY id DESC"
    );

    // No conversion needed, image_link is full signed URL already
    res.json(rows);
  } catch (err) {
    console.error("Gallery fetch error:", err);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

/* --------------------------------------------------------
   GET Pending Images (Admin)
--------------------------------------------------------- */
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

/* --------------------------------------------------------
   GET Approved Images (Admin)
--------------------------------------------------------- */
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

/* --------------------------------------------------------
   UPLOAD IMAGE
--------------------------------------------------------- */
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
        // Generate signed URL for access
        const [signedUrl] = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        // Store full signed URL directly in DB
        const db = await connectToDatabase();
        const [result] = await db.query(
          "INSERT INTO foods_gallery (name, phone, type, image_link, status) VALUES (?, ?, ?, ?, 'pending')",
          [name, phone, type, signedUrl]
        );

        res.json({
          message: "Image uploaded successfully (pending approval)",
          id: result.insertId,
          name,
          phone,
          type,
          image_link: signedUrl,
          status: "pending",
        });
      } catch (err) {
        console.error("Signed URL error:", err);
        res.status(500).json({
          error: "Failed to generate signed URL",
          details: err.message,
        });
      }
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
