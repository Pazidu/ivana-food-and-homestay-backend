// routes/galleryRoutes.js
import express from "express";
import multer from "multer";
import admin from "../Firebase/admin.js";
import { connectToDatabase } from "../lib/db.js";

const router = express.Router();
const bucket = admin.storage().bucket("contra-cloud.firebasestorage.app");
console.log("Firebase Bucket:", bucket.name);

// Multer: store files in memory
const upload = multer({ storage: multer.memoryStorage() });

/* ============================================================
   GET Approved Images (Users)
============================================================ */
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

/* ============================================================
   GET Pending Images (Admin)
============================================================ */
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

/* ============================================================
   GET Approved Images (Admin)
============================================================ */
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

/* ============================================================
   USER UPLOAD IMAGE (Pending)
============================================================ */
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
        const [signedUrl] = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });

        const db = await connectToDatabase();
        const [result] = await db.query(
          "INSERT INTO foods_gallery (name, phone, type, image_link, status) VALUES (?, ?, ?, ?, 'pending')",
          [name, phone, type, signedUrl]
        );

        res.json({
          message: "Image uploaded (pending approval)",
          id: result.insertId,
          name,
          phone,
          type,
          image_link: signedUrl,
          status: "pending",
        });
      } catch (err) {
        console.error("Signed URL error:", err);
        res.status(500).json({ error: "Failed to generate signed URL" });
      }
    });

    blobStream.end(file.buffer);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* ============================================================
   ⭐ ADMIN UPLOAD (NEW SYSTEM)
   Always APPROVED, no name/phone from user
============================================================ */
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

/* ============================================================
   REJECT IMAGE
============================================================ */
router.put("/gallery/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectToDatabase();

    await db.query("UPDATE foods_gallery SET status='rejected' WHERE id=?", [
      id,
    ]);

    res.json({ message: "Image rejected" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: "Failed to reject image" });
  }
});

/* ============================================================
   DELETE IMAGE
============================================================ */
router.delete("/gallery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await connectToDatabase();

    await db.query("DELETE FROM foods_gallery WHERE id=?", [id]);

    res.json({ message: "Image deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
