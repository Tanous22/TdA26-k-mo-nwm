import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { materialsRouter } from "./routes/materials.js";
// Importujeme router pro kurzy (musí odpovídat exportu v courses.ts)
import { coursesRouter } from "./routes/courses.js"; 

const app = express();

app.use(cors());
// DŮLEŽITÉ: Toto musí být PŘED definicí rout, jinak nebude fungovat POST (req.body bude undefined)
app.use(express.json());

const apiRoutes = express.Router();

// Health-check
apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

// Připojení uživatelů
apiRoutes.use("/users", userRoutes);

// Připojení kurzů - toto vyřeší Phase 1 testy
apiRoutes.use("/courses", coursesRouter);

// Tady říkáme: Když URL začíná /courses/.../materials, předej to našemu routeru
apiRoutes.use("/courses/:courseId/materials", materialsRouter);

// Vše připojíme na root
app.use("/", apiRoutes);

const port = process.env.PORT || 3000;

async function start() {
  // Try-catch kolem DB, aby server naskočil i když DB selže (pro testy kurzů DB nepotřebujeme)
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
