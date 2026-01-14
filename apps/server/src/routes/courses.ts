import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
// NOVÉ IMPORTY:
import { quizzesRouter } from "./quizzes.js";
import { materialsRouter } from "./materials.js";

export const coursesRouter = Router();

// --- PROPOJENÍ POD-ROUTERŮ (TOHLE TU CHYBĚLO) ---
// Všechny adresy začínající /:courseId/quizzes pošleme do quizzesRouter
coursesRouter.use("/:courseId/quizzes", quizzesRouter);
// Všechny adresy začínající /:courseId/materials pošleme do materialsRouter
coursesRouter.use("/:courseId/materials", materialsRouter);
// -----------------------------------------------

// Pomocná funkce pro parsování JSONu z DB
const parseJson = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
};

// Interface podle Swaggeru
interface Course {
    uuid: string;
    name: string;
    description: string;
    difficulty: string; 
    materials: any[];
    quizzes: any[];
    feed: any[];
}

// GET /courses - Seznam kurzů
coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses");
        
        const courses = (rows as any[]).map(row => ({
            uuid: row.uuid,
            name: row.name,
            description: row.description,
            difficulty: row.difficulty || "",
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

// GET /courses/:courseId - Detail kurzu (VČETNĚ KVÍZŮ A MATERIÁLŮ PRO ZOBRAZENÍ)
coursesRouter.get("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
        // 1. Načtení kurzu
        const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
        const result = rows as any[];
        const courseData = result[0];

        if (!courseData) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        // 2. Načtení materiálů
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

        // 3. Načtení kvízů
        const [quizRows] = await pool.execute(
            `SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount
             FROM quizzes q 
             WHERE q.course_id = ? 
             ORDER BY q.created_at DESC`,
            [courseData.id]
        );

        const quizzes = [];
        for (const qRow of (quizRows as any[])) {
            const [questionRows] = await pool.execute(
                "SELECT * FROM quiz_questions WHERE quiz_id = ?",
                [qRow.id]
            );

            const questions = (questionRows as any[]).map(q => {
                const options = parseJson(q.options);
                const correctAnswer = parseJson(q.correct_answer);

                const base = {
                    uuid: q.uuid,
                    type: q.type,
                    question: q.question,
                    options: options,
                };
                if (q.type === 'singleChoice') {
                    return { ...base, correctIndex: correctAnswer };
                } else {
                    return { ...base, correctIndices: correctAnswer };
                }
            });

            quizzes.push({
                uuid: qRow.uuid,
                title: qRow.title,
                attemptsCount: qRow.attemptsCount || 0,
                questions: questions
            });
        }

        // 4. Feed (placeholder)
        let feed: any[] = [];
        try {
             const [feedRows] = await pool.execute(
                "SELECT * FROM feeds WHERE course_id = ? ORDER BY created_at DESC", 
                [courseData.id]
             );
             feed = (feedRows as any[]).map(f => ({
                 uuid: f.uuid,
                 type: f.type,
                 message: f.message,
                 edited: Boolean(f.edited),
                 createdAt: f.created_at,
                 updatedAt: f.updated_at
             }));
        } catch (e) {
            feed = [];
        }

        const course: Course = {
            uuid: courseData.uuid,
            name: courseData.name,
            description: courseData.description,
            difficulty: courseData.difficulty || "",
            materials: materials,
            quizzes: quizzes,
            feed: feed
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
            [name, description, difficulty || "", courseId]
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