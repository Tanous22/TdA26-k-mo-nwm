import "dotenv/config";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db/init.js";
import { userRoutes } from "./routes/users.js";

const app = express();

app.use(cors());
app.use(express.json());

// jednoduchý logger – uvidíme, jaká URL na backend opravdu chodí
app.use((req, _res, next) => {
	console.log(`[request] ${req.method} ${req.url}`);
	next();
});

const apiRoutes = express.Router();

// test endpoint – měl by vracet JSON na /api
apiRoutes.get("/", (_req, res) => {
	res.status(200).json({ organization: "Student Cyber Games" });
});

// /api/users
apiRoutes.use("/users", userRoutes);

// všechny API routy začínají /api
app.use("/api", apiRoutes);

// volitelný root backendu – na http://server:3000/
app.get("/", (_req, res) => {
	res.status(200).send("Backend is up");
});

const port = process.env.PORT || 3000;

async function start() {
	await initDatabase();
	app.listen(port, () => {
		console.log(`Server is running on port ${port}`);
	});
}

start();
