import express from "express";
import { pool } from "@/db";

export const userRoutes = express.Router();

// GET /api/users — vrací všechny uživatele
userRoutes.get("/", async (_req, res) => {
	try {
		const [rows] = await pool.execute("SELECT * FROM users");
		res.status(200).json(rows);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ error: "Failed to fetch users" });
	}
});

// POST /api/users — vytvoří nového uživatele
userRoutes.post("/", async (req, res) => {
	const { email, name } = req.body;

	if (!email || !name) {
		return res.status(400).json({ error: "Missing email or name" });
	}

	try {
		const [result] = await pool.execute(
			"INSERT INTO users (email, name) VALUES (?, ?)",
			[email, name]
		);

		res.status(201).json({
			id: result.insertId,
			email,
			name,
		});
	} catch (error) {
		console.error("Error creating user:", error);
		res.status(500).json({ error: "Failed to create user" });
	}
});
