import express from "express";
import cors from "cors";
import mysql from "mysql2";
import authRouter from "./routes/authRoutes.js";
import reviewRouter from "./routes/reviewsRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);
app.use("/api", reviewRouter);

// ✅ Database connection
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ivana",
});

// ✅ Menu route (already there)
app.get("/api/foods/menu", (req, res) => {
  const { type } = req.query; // ?type=...
  db.query(`SELECT * FROM menu WHERE type = ?`, [type], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ Get all reviews
app.get("/api/foods/reviews", (req, res) => {
  db.query("SELECT * FROM reviews", (err, results) => {
    if (err) {
      console.error("Error fetching reviews:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ✅ Add a new review
app.post("/api/foods/reviews", (req, res) => {
  const { name, comment, rating } = req.body;

  if (!name || !comment || !rating) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "INSERT INTO reviews (name, comment, rating) VALUES (?, ?, ?)",
    [name, comment, rating],
    (err, result) => {
      if (err) {
        console.error("Error adding review:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        message: "Review added successfully",
        review: { id: result.insertId, name, comment, rating },
      });
    }
  );
});

// ✅ Get all menu items
app.get("/api/menu", (req, res) => {
  db.query("SELECT * FROM menu", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ✅ Add a new menu item
app.post("/api/menu", (req, res) => {
  const { name, type, regular_price, large_price, image_link } = req.body;
  db.query(
    "INSERT INTO menu (name, type, regular_price, large_price, image_link) VALUES (?, ?, ?, ?, ?)",
    [name, type, regular_price, large_price, image_link],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({
        id: result.insertId,
        name,
        type,
        regular_price,
        large_price,
        image_link,
      });
    }
  );
});

// ✅ Delete a menu item
app.delete("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM menu WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Item deleted successfully" });
  });
});

// ✅ Edit a menu item
app.put("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  const { name, type, regular_price, large_price, image_link } = req.body;

  db.query(
    "UPDATE menu SET name=?, type=?, regular_price=?, large_price=?, image_link=? WHERE id=?",
    [name, type, regular_price, large_price, image_link, id],
    (err) => {
      if (err) return res.status(500).json(err);

      // 🔥 fetch the updated row and return it
      db.query("SELECT * FROM menu WHERE id=?", [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]); // return updated item
      });
    }
  );
});

// ✅ Get all users
app.get("/api/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ✅ Add a new user
app.post("/api/users", (req, res) => {
  const { username, email, address, city, phone } = req.body;
  db.query(
    "INSERT INTO users (username, email, address, city, phone) VALUES (?, ?, ?, ?, ?)",
    [username, email, address, city, phone],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({
        id: result.insertId,
        username,
        email,
        address,
        city,
        phone,
      });
    }
  );
});

// ✅ Delete a user
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User deleted successfully" });
  });
});

// ✅ Edit a user
// app.put("/api/users/:id", (req, res) => {
//   const { id } = req.params;
//   const { name, email, role } = req.body;

//   db.query(
//     "UPDATE users SET name=?, email=?, role=? WHERE id=?",
//     [name, email, role, id],
//     (err) => {
//       if (err) return res.status(500).json(err);

//       // fetch the updated row and return it
//       db.query("SELECT * FROM users WHERE id=?", [id], (err, result) => {
//         if (err) return res.status(500).json(err);
//         res.json(result[0]); // return updated user
//       });
//     }
//   );
// });

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
