import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";
import { pool } from "./db/index.js";

const app = express();

app.use(cors());
app.use(express.json());

const apiRoutes = express.Router();

// Root endpoint (pro TdA testy)
apiRoutes.get("/", (_req, res) => {
	res.status(200).json({ organization: "Student Cyber Games" });
});

// Healthcheck databáze
apiRoutes.get("/health/db", async (_req, res) => {
	try {
		await pool.query("SELECT 1");
		res.json({ status: "ok" });
	} catch (err) {
		console.error("DB healthcheck error:", err);
		res.status(500).json({ status: "error", message: "DB not reachable" });
	}
});

// Users endpointy
apiRoutes.use("/users", userRoutes);

// Registrace všech API rout
app.use("/api", apiRoutes);

const port = process.env.PORT || 3000;

async function start() {
	await initDatabase();
	app.listen(port, () => {
		console.log(`Server is running on port ${port}`);
	});
}

start();
