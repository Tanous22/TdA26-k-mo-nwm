import "dotenv/config";
import { pool } from "./index.js";
import { initDatabase } from "./init.js"; // Importujeme funkci pro tvorbu tabulek
import { v4 as uuidv4 } from "uuid";
async function seed() {
  try {
    console.log("🌱 Začínám kompletní reset a seedování...");
    console.log("🔥 Mazání starých tabulek...");
    await pool.execute("SET FOREIGN_KEY_CHECKS = 0");
    await pool.execute("DROP TABLE IF EXISTS quiz_attempts");
    await pool.execute("DROP TABLE IF EXISTS quiz_questions");
    await pool.execute("DROP TABLE IF EXISTS quizzes");
    await pool.execute("DROP TABLE IF EXISTS materials");
    await pool.execute("DROP TABLE IF EXISTS courses");
    await pool.execute("DROP TABLE IF EXISTS users");
    await pool.execute("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✅ Tabulky smazány.");
    console.log("🏗️ Vytvářím nové tabulky...");
    await initDatabase();
    console.log("📝 Vkládám data...");
    const [userRes] = await pool.execute(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        ["test@example.com", "Test User"]
    );
    console.log("   -> Uživatel vytvořen");
    const courseUuid = uuidv4();
    const [courseRes] = await pool.execute(
        "INSERT INTO courses (uuid, name, description, difficulty) VALUES (?, ?, ?, ?)",
        [courseUuid, "Demo Kurz Fáze 3", "Testovací kurz pro kvízy", "Začátečník"]
    );
    const courseId = (courseRes as any).insertId;
    console.log("   -> Kurz vytvořen");
    const quizUuid = uuidv4();
    const [quizRes] = await pool.execute(
      "INSERT INTO quizzes (uuid, course_id, title) VALUES (?, ?, ?)",
      [quizUuid, courseId, "Testovací Kvíz: Základy"]
    );
    const quizId = (quizRes as any).insertId;
    console.log("   -> Kvíz vytvořen");
    await pool.execute(
      `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        quizId,
        "singleChoice",
        "Kolik je 2 + 2?",
        JSON.stringify(["3", "4", "5", "10"]), 
        JSON.stringify(1) // Index 1 je "4"
      ]
    );
    await pool.execute(
      `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        quizId,
        "multipleChoice",
        "Která zvířata umí létat?",
        JSON.stringify(["Pes", "Orel", "Kočka", "Netopýr"]),
        JSON.stringify([1, 3]) // Indexy pro Orel a Netopýr
      ]
    );
    console.log("   -> Otázky vloženy");
    await pool.execute(
      `INSERT INTO materials (uuid, course_id, type, name, description, content, mime_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        uuidv4(),
        courseId,
        "url",
        "MDN Web Docs - JavaScript",
        "Oficiální dokumentace JavaScriptu",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/",
        null
      ]
    );
    await pool.execute(
      `INSERT INTO materials (uuid, course_id, type, name, description, content, mime_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        uuidv4(),
        courseId,
        "file",
        "Přípravný materiál.pdf",
        "PDF se základními pojmy",
        "sample-material.pdf",
        "application/pdf"
      ]
    );
    console.log("   -> Materiály vloženy");
    console.log("✅ HOTOVO! Databáze je čistá a naplněná.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Chyba při seedování:", error);
    process.exit(1);
  }
}
seed();
