import "dotenv/config";
import { pool } from "./index.js";

export async function initDatabase() {
  try {
    console.log("Initializing database schema...");

    // 1. Tabulka USERS
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabulka COURSES
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty VARCHAR(50) DEFAULT 'Jednoduchý',
        category VARCHAR(100) DEFAULT 'Programování',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabulka MATERIALS
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        course_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // 4. Tabulka QUIZZES
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // 5. Tabulka QUIZ_QUESTIONS
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        quiz_id INT NOT NULL,
        type ENUM('singleChoice', 'multipleChoice') NOT NULL,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    // 6. Tabulka QUIZ_ATTEMPTS
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        quiz_id INT NOT NULL,
        score INT NOT NULL,
        max_score INT NOT NULL,
        answers JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    // 7. Tabulka FEED_EVENTS (Opraveno: přidán updated_at a is_edited)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS feed_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        course_id INT NOT NULL,
        type ENUM('message', 'system') NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(255),
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Seed default usera
    const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM users");
    const count = (rows as any)[0].count as number;

    if (count === 0) {
      await pool.execute(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        ["test@example.com", "Test User"]
      );
      console.log("Inserted sample user into 'users' table");
    }

    console.log("Database schema initialized successfully!");
  } catch (error) {
    console.error("CRITICAL: Error initializing database:", error);
  }
}