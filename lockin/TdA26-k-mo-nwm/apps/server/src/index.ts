import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { coursesRouter } from "./routes/courses.js"; // <--- PŘIDAT IMPORT

const app = express();

app.use(cors());
app.use(express.json());

const apiRoutes = express.Router();

// health-check / info
apiRoutes.get("/", (_req, res) => {
  res.status(200).json({ organization: "Student Cyber Games" });
});

// /users → vrací uživatele
apiRoutes.use("/users", userRoutes);

// /courses -> vrací kurzy (pro testy)
apiRoutes.use("/courses", coursesRouter); // <--- PŘIDAT ROUTU

// DŮLEŽITÉ: připojit router na root, ne na /api
app.use("/", apiRoutes);

const port = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

start();