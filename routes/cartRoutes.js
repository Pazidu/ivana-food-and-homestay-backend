import express from "express";
import { connectToDatabase } from "../lib/db.js";
import jwt from "jsonwebtoken";

// 🔹 Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user; // Attach user payload to request
    next();
  });
};

const router = express.Router();

// ✅ Get cart items for logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, item_id, item_name, description, unit_price, quantity FROM cart WHERE user_id = ?",
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching cart:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ✅ Add to cart API
router.post("/add", authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const items = req.body; // [{ item_id, description, quantity }, ...]
    const userId = req.user.id; // Logged-in user's ID from token

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid data" });
    }

    for (const item of items) {
      // Fetch item details from menu table
      const [rows] = await db.query(
        "SELECT name, regular_price, large_price FROM menu WHERE id = ?",
        [item.item_id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: `Item ${item.item_id} not found` });
      }

      const menuItem = rows[0];
      const unit_price =
        item.description === "Regular"
          ? menuItem.regular_price
          : menuItem.large_price;

      // Insert into cart
      await db.query(
        "INSERT INTO cart (user_id, item_id, item_name, description, unit_price, quantity) VALUES (?, ?, ?, ?, ?, ?)",
        [
          userId,
          item.item_id,
          menuItem.name,
          item.description,
          unit_price,
          item.quantity,
        ]
      );
    }

    res.json({ success: true, inserted: items.length });
  } catch (err) {
    console.error("Error inserting cart:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Clear all items in cart after payment
router.delete("/clear", authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.query("DELETE FROM cart WHERE user_id = ?", [req.user.id]);
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// ✅ Remove item from cart
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const userId = req.user.id;
    const cartItemId = req.params.id;

    // Ensure only the logged-in user's item is deleted
    const [result] = await db.query(
      "DELETE FROM cart WHERE id = ? AND user_id = ?",
      [cartItemId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found in your cart" });
    }

    res.json({ message: "Item removed successfully" });
  } catch (err) {
    console.error("Error removing item:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ✅ Update item quantity
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    // Update only if the item belongs to logged-in user
    await db.query(
      "UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?",
      [quantity, cartItemId, userId]
    );

    const [rows] = await db.query(
      "SELECT id, item_id, item_name, description, unit_price, quantity FROM cart WHERE id = ? AND user_id = ?",
      [cartItemId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Item not found in your cart" });
    }

    res.json(rows[0]); // send updated item back
  } catch (err) {
    console.error("Error updating quantity:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;