import "dotenv/config";
import cors from "cors";
import express from "express";
import { modulesRouter } from "./routes/modules.js";
import { initDatabase } from "./db/init.js";
import { pool } from "./db/index.js"; // Přidán import pool
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
import { coursesRouter } from "./routes/courses.js";
import { quizzesRouter } from "./routes/quizzes.js";
import { feedRouter } from "./routes/feed.js";
import path from "path";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json());

// Opravená routa pro stahování souborů
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  try {
    // 1. Najdeme původní název souboru v databázi podle UUID (content)
    const [rows] = await pool.execute(
      "SELECT name, mime_type FROM materials WHERE content = ?",
      [filename]
    );

    let downloadName = filename;
    let mimeType = 'application/octet-stream';

    if ((rows as any).length > 0) {
        const fileData = (rows as any)[0];
        downloadName = fileData.name; // Původní název (např. "skripta.pdf")
        if (fileData.mime_type) {
            mimeType = fileData.mime_type;
        }
    }

    // 2. Nastavíme hlavičky
    res.setHeader('Content-Type', mimeType);
    // filename*=UTF-8'' zajistí správné zobrazení češtiny
    res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${encodeURIComponent(downloadName)}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );

  } catch (error) {
    console.error("Chyba při zjišťování názvu souboru:", error);
    // V případě chyby DB pošleme soubor s technickým názvem
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  // 3. Odešleme soubor
  res.sendFile(filePath);
});

app.use((req, res, next) => {
  console.log(`\n------------------------------------------------`);
  console.log(`[SERVER PŘIJAL]: ${req.method} ${req.url}`);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`[DATA (BODY)]:`, JSON.stringify(req.body, null, 2));
  }
  console.log(`------------------------------------------------\n`);
  next();
});

const apiRoutes = express.Router();

apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

app.use("/", apiRoutes);
apiRoutes.use("/users", userRoutes);
apiRoutes.use("/courses", coursesRouter);
apiRoutes.use("/modules", modulesRouter);

const port = process.env.PORT || 3000;

async function start() {
  try {
    await initDatabase();
  } catch (e) {
    console.error("Database connection failed, but starting server anyway:", e);
  }
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log("ČEKÁM NA POŽADAVKY...");
  });
}

start();