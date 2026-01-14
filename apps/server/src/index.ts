import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
import { coursesRouter } from "./routes/courses.js";
import { quizzesRouter } from "./routes/quizzes.js";

const app = express();

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

// --- ZMĚNA POŘADÍ ---
// Nejdřív musíme obsloužit konkrétní pod-stránky (materiály, kvízy)
apiRoutes.use("/courses/:courseId/materials", materialsRouter);
apiRoutes.use("/courses/:courseId/quizzes", quizzesRouter);

// Až nakonec obecné kurzy (jinak by to 'sežralo' i ty požadavky výše)
apiRoutes.use("/courses", coursesRouter);
// --------------------

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