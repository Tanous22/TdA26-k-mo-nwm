import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";

export const coursesRouter = Router();

// Interface pro TypeScript
interface Course {
    uuid: string;
    name: string;
    description: string;
    difficulty: string; 
    materials: any[];
    quizzes: string[];
    feed: string[];
}

// GET /courses - Seznam kurzů
coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses");
        
        const courses = (rows as any[]).map(row => ({
            uuid: row.uuid,
            name: row.name,
            description: row.description,
            difficulty: row.difficulty || "", // ZMĚNA: Fallback na prázdný string
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

    const uuid = uuidv4();
    const name = req.body.name;
    const description = req.body.description || "";
    // ZMĚNA: Pokud frontend nic nepošle, dáme prázdný string (db ošéfuje)
    const difficulty = req.body.difficulty || ""; 

    try {
        await pool.execute(
            "INSERT INTO courses (uuid, name, description, difficulty) VALUES (?, ?, ?, ?)",
            [uuid, name, description, difficulty]
        );

        const newCourse: Course = {
            uuid,
            name,
            description,
            difficulty, 
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

// GET /courses/:courseId - Detail kurzu
coursesRouter.get("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
        const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
        const result = rows as any[];
        const courseData = result[0];

        if (!courseData) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        const [materialRows] = await pool.execute(
            `SELECT uuid, type, name, description, content, mime_type 
             FROM materials 
             WHERE course_id = ? 
             ORDER BY created_at DESC`,
            [courseData.id]
        );

        const materials = (materialRows as any[]).map(m => ({
            uuid: m.uuid,
            type: m.type,
            name: m.name,
            description: m.description,
            mimeType: m.mime_type,
            url: m.type === 'url' ? m.content : undefined,
            fileUrl: m.type === 'file' ? `/uploads/${m.content}` : undefined
        }));

        const course: Course = {
            uuid: courseData.uuid,
            name: courseData.name,
            description: courseData.description,
            difficulty: courseData.difficulty || "", // ZMĚNA: Fallback na prázdný string
            materials: materials,
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
    const { name, description, difficulty } = req.body; 

    try {
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ?, difficulty = ? WHERE uuid = ?",
            [name, description, difficulty || "", courseId] // ZMĚNA: Fallback na prázdný string
        );
        
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Not found or no change" });
             return;
        }

        res.status(200).json({ 
            uuid: courseId, 
            name, 
            description,
            difficulty: difficulty || "", 
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