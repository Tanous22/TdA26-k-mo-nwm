import "dotenv/config";
import { pool } from "./index.js";

export async function initDatabase() {
  try {
    console.log("Initializing database schema...");

    // 1) vytvoření tabulky, pokud neexistuje
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2) zjistíme, kolik je v tabulce záznamů
    const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM users");
    const count = (rows as any)[0].count as number;

    // 3) když je prázdná, vložíme jednoho ukázkového uživatele
    if (count === 0) {
      await pool.execute(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        ["test@example.com", "Test User"]
      );
      console.log("Inserted sample user into 'users' table");
    }

    console.log("Database schema initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
