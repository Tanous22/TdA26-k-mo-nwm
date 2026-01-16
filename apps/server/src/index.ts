import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
import { coursesRouter } from "./routes/courses.js";
import { quizzesRouter } from "./routes/quizzes.js";
import { feedRouter } from "./routes/feed.js";

const app = express();

app.use(cors());
app.use(express.json());

// Custom file download route with proper headers
import path from "path";
import fs from "fs";
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Set proper headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Let express guess content-type based on file extension
  res.sendFile(filePath);
});

// --- TOTÁLNÍ DEBUG LOGOVÁNÍ ---
app.use((req, res, next) => {
  console.log(`\n------------------------------------------------`);
  console.log(`[SERVER PŘIJAL]: ${req.method} ${req.url}`);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`[DATA (BODY)]:`, JSON.stringify(req.body, null, 2));
  }
  console.log(`------------------------------------------------\n`);
  next();
});
// ------------------------------

const apiRoutes = express.Router();

apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

app.use("/", apiRoutes);
apiRoutes.use("/users", userRoutes);

// Kurzy - veškerá vnořená logika (materiály, kvízy, feed) je v coursesRouter
apiRoutes.use("/courses", coursesRouter);

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