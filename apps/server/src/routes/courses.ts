import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
// 1. DŮLEŽITÉ IMPORTY
import { quizzesRouter } from "./quizzes.js";
import { materialsRouter } from "./materials.js";

export const coursesRouter = Router();

// 2. DŮLEŽITÉ PROPOJENÍ (ROZCESTNÍK)
// Bez tohoto server neví, že existují nějaké kvízy nebo materiály!
coursesRouter.use("/:courseId/quizzes", quizzesRouter);
coursesRouter.use("/:courseId/materials", materialsRouter);

// --- Zbytek kódu pro kurzy ---

const parseJson = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
};

interface Course {
    uuid: string;
    name: string;
    description: string;
    difficulty: string;
    materials: any[];
    quizzes: any[];
    feed: any[];
}

// GET /courses
coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses ORDER BY created_at DESC");
        const courses = [];

        for (const row of (rows as any[])) {
            // Fetch materials for this course
            const [materialRows] = await pool.execute(
                `SELECT uuid, type, name, description, content, mime_type FROM materials WHERE course_id = ?`,
                [row.id]
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

            // Fetch quizzes for this course
            const [quizRows] = await pool.execute(
                `SELECT * FROM quizzes WHERE course_id = ?`,
                [row.id]
            );
            // We just need the quiz objects for the dashboard count/list. 
            // Full question parsing might be heavy but let's at least give the correctly typed objects.
            const quizzes = (quizRows as any[]).map(q => ({
                uuid: q.uuid,
                title: q.title,
                // We could fetch questions here if needed, but for dashboard lists, usually the existence/count is enough.
                // If the frontend relies on questions.length for some reason, we might need more, 
                // but usually dashboard just shows "3 Quizzes".
                // Let's keep questions empty to match the minimal "list" requirement, 
                // but crucial is that 'quizzes' array has the right length.
                questions: []
            }));

            courses.push({
                uuid: row.uuid,
                name: row.name,
                description: row.description,
                difficulty: row.difficulty || "",
                materials,
                quizzes,
                feed: []
            });
        }

        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses
coursesRouter.post("/", async (req: Request, res: Response) => {
    if (!req.body || !req.body.name) {
        res.status(400).json({ error: "Missing data" });
        return;
    }
    const uuid = uuidv4();
    const { name, description = "", difficulty = "" } = req.body;
    try {
        await pool.execute(
            "INSERT INTO courses (uuid, name, description, difficulty) VALUES (?, ?, ?, ?)",
            [uuid, name, description, difficulty]
        );
        res.status(201).json({ uuid, name, description, difficulty, materials: [], quizzes: [], feed: [] });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId
coursesRouter.get("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
        const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
        const courseData = (rows as any[])[0];
        if (!courseData) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        // Načtení materiálů
        const [materialRows] = await pool.execute(
            `SELECT uuid, type, name, description, content, mime_type FROM materials WHERE course_id = ? ORDER BY created_at DESC`,
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

        // Načtení kvízů
        const [quizRows] = await pool.execute(
            `SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount FROM quizzes q WHERE q.course_id = ? ORDER BY q.created_at DESC`,
            [courseData.id]
        );
        const quizzes = [];
        for (const qRow of (quizRows as any[])) {
            const [questionRows] = await pool.execute("SELECT * FROM quiz_questions WHERE quiz_id = ?", [qRow.id]);
            const questions = (questionRows as any[]).map(q => {
                const options = parseJson(q.options);
                const correctAnswer = parseJson(q.correct_answer);
                const base = { uuid: q.uuid, type: q.type, question: q.question, options };
                return q.type === 'singleChoice' ? { ...base, correctIndex: correctAnswer } : { ...base, correctIndices: correctAnswer };
            });
            quizzes.push({ uuid: qRow.uuid, title: qRow.title, attemptsCount: qRow.attemptsCount || 0, questions });
        }

        res.status(200).json({
            uuid: courseData.uuid,
            name: courseData.name,
            description: courseData.description,
            difficulty: courseData.difficulty || "",
            materials,
            quizzes,
            feed: []
        });
    } catch (error) {
        console.error("Error fetching course detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT /courses/:courseId
coursesRouter.put("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { name, description, difficulty } = req.body;
    try {
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ?, difficulty = ? WHERE uuid = ?",
            [name, description, difficulty || "", courseId]
        );
        if ((result as any).affectedRows === 0) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(200).json({ uuid: courseId, name, description, difficulty: difficulty || "", materials: [], quizzes: [], feed: [] });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE /courses/:courseId
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