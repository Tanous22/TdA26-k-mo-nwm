import "dotenv/config";
import { pool } from "./index.js";

export async function initDatabase() {
  try {
    console.log("Initializing database schema...");

    // 1. Tabulka USERS - základní auth
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabulka COURSES - persistentní uložení kurzů (konec s in-memory polem!) [cite: 25]
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check, jestli už máme nějaká data, ať nestartujeme s úplně prázdnou DB
    const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM users");
    const count = (rows as any)[0].count as number;

    // Seed default usera pro rychlé testování
    if (count === 0) {
      await pool.execute(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        ["test@example.com", "Test User"]
      );
      console.log("Inserted sample user into 'users' table");
    }

    console.log("Database schema initialized successfully!");
  } catch (error) {
    // Pokud tohle failne, celá appka je v podstatě nepoužitelná
    console.error("CRITICAL: Error initializing database:", error);
  }
}