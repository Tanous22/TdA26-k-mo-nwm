import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { pool } from "../db/index.js";

export const coursesRouter = Router();

interface Course {
    uuid: string;
    name: string;
    description: string;
    materials: any[];
    quizzes: string[];
    feed: string[];
}

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses - Seznam kurzů
coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses");
        
        const courses = (rows as any[]).map(row => ({
            uuid: row.uuid,
            name: row.name,
            description: row.description,
            materials: [], 
            quizzes: [], 
            feed: [] 
        }));

        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses - Vytvoření kurzu
coursesRouter.post("/", async (req: Request, res: Response) => {
    if (!req.body || !req.body.name) {
         res.status(400).json({ error: "Missing data" });
         return;
    }

    const uuid = generateId();
    const name = req.body.name;
    const description = req.body.description || "";

    try {
        await pool.execute(
            "INSERT INTO courses (uuid, name, description) VALUES (?, ?, ?)",
            [uuid, name, description]
        );

        const newCourse: Course = {
            uuid,
            name,
            description,
            materials: [],
            quizzes: [],
            feed: []
        };
        
        res.status(201).json(newCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId - Detail kurzu (VČETNĚ MATERIÁLŮ)
coursesRouter.get("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
        // 1. Najdeme kurz
        const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
        const result = rows as any[];
        const courseData = result[0];

        if (!courseData) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        // 2. Načteme materiály pro tento kurz (Test 8)
        const [materialRows] = await pool.execute(
            `SELECT uuid, type, name, description, content, mime_type 
             FROM materials 
             WHERE course_id = ? 
             ORDER BY created_at DESC`,
            [courseData.id]
        );

        // 3. Naformátujeme materiály
        const materials = (materialRows as any[]).map(m => ({
            uuid: m.uuid,
            type: m.type,
            name: m.name,
            description: m.description,
            mimeType: m.mime_type,
            url: m.type === 'url' ? m.content : undefined,
            fileUrl: m.type === 'file' ? `/uploads/${m.content}` : undefined
        }));

        // 4. Vrátíme kurz i s materiály
        const course: Course = {
            uuid: courseData.uuid,
            name: courseData.name,
            description: courseData.description,
            materials: materials, // Zde vkládáme načtené materiály
            quizzes: [],
            feed: []
        };
        res.status(200).json(course);

    } catch (error) {
        console.error("Error fetching course detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT /courses/:courseId - Editace
coursesRouter.put("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { name, description } = req.body;

    try {
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ? WHERE uuid = ?",
            [name, description, courseId]
        );
        
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Not found or no change" });
             return;
        }

        res.status(200).json({ 
            uuid: courseId, 
            name, 
            description,
            materials: [], quizzes: [], feed: [] 
        });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE /courses/:courseId - Mazání
coursesRouter.delete("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM courses WHERE uuid = ?", [courseId]);
        
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Not found" });
             return;
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ error: "Database error" });
    }
});