import mysql from "mysql2/promise";

let pool;

export const connectToDatabase = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "ivana",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log("✅ MySQL pool created");
    }
    return pool;
  } catch (err) {
    console.error("DB connection failed:", err.message);
    throw err;
  }
};
