import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
import { coursesRouter } from "./routes/courses.js";
import { quizzesRouter } from "./routes/quizzes.js";

const app = express();

// --- 1. ŠPIÓN (LOGOVÁNÍ KAŽDÉHO POŽADAVKU) ---
// Díky tomuto uvidíš v terminálu [SERVER-SPY] kdykoliv se něco stane
app.use((req, res, next) => {
    console.log(`[SERVER-SPY] ${req.method} ${req.url}`);
    next();
});
// ---------------------------------------------

app.use(cors());
app.use(express.json());

const apiRoutes = express.Router();

// Health-check
apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

app.use("/", apiRoutes);

// Připojení uživatelů
apiRoutes.use("/users", userRoutes);

// --- 2. SPRÁVNÉ POŘADÍ (SPECIFICKÉ PRVNÍ!) ---
// Nejdřív musíme obsloužit konkrétní pod-stránky
apiRoutes.use("/courses/:courseId/materials", materialsRouter);
apiRoutes.use("/courses/:courseId/quizzes", quizzesRouter);

// Až nakonec obecné kurzy (jinak by to 'sežralo' i ty požadavky výše)
apiRoutes.use("/courses", coursesRouter);
// ---------------------------------------------

const port = process.env.PORT || 3000;

async function start() {
  try {
    await initDatabase();
  } catch (e) {
    console.error("Database connection failed, but starting server anyway:", e);
  }
  
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

start();