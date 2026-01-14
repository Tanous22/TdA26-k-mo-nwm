import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
import { coursesRouter } from "./routes/courses.js";
import { quizzesRouter } from "./routes/quizzes.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
// DŮLEŽITÉ: Musí být před definicí rout
app.use(express.json());

const apiRoutes = express.Router();

// Health-check
apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

// -----------------------------------------------------------
// 1. SPECIFICKÉ ROUTY (Musí být PRVNÍ!)
// -----------------------------------------------------------

// Kvízy - specifická cesta musí mít přednost
apiRoutes.use("/courses/:courseId/quizzes", quizzesRouter);

// Materiály - specifická cesta musí mít přednost
apiRoutes.use("/courses/:courseId/materials", materialsRouter);


// -----------------------------------------------------------
// 2. OBECNÉ ROUTY (Až potom)
// -----------------------------------------------------------

// Kurzy
apiRoutes.use("/courses", coursesRouter);

// Uživatelé
apiRoutes.use("/users", userRoutes);


// Připojení routeru k aplikaci
app.use("/", apiRoutes);

async function start() {
  try {
    await initDatabase();
    console.log("Database initialized successfully");
  } catch (e) {
    console.error("Database connection failed, but starting server anyway:", e);
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

start();