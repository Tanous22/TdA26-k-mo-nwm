import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
// 1. DŮLEŽITÉ IMPORTY
import { quizzesRouter } from "./quizzes.js";
import { materialsRouter } from "./materials.js";
import { feedRouter } from "./feed.js";
import { broadcastToCourse } from "./feed.js";

export const coursesRouter = Router();

// 2. DŮLEŽITÉ PROPOJENÍ (ROZCESTNÍK)
// Bez tohoto server neví, že existují nějaké kvízy nebo materiály!
coursesRouter.use("/:courseId/quizzes", quizzesRouter);
coursesRouter.use("/:courseId/materials", materialsRouter);
coursesRouter.use("/:courseId/feed", feedRouter);

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

// --- NOVÁ POMOCNÁ FUNKCE (PRO DRY PRINCIP A BEZPEČNOST) ---
const getFullCourseData = async (courseId: string) => {
    const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
    const courseData = (rows as any[])[0];
    if (!courseData) return null;

    // Načtení a sanitizace materiálů (filter odstraní null řádky)
    const [materialRows] = await pool.execute(
        `SELECT uuid, type, name, description, content, mime_type FROM materials WHERE course_id = ? ORDER BY created_at DESC`,
        [courseData.id]
    );
    const materials = (materialRows as any[])
        .filter(m => m) 
        .map(m => ({
            uuid: m.uuid,
            type: m.type,
            name: m.name,
            description: m.description,
            mimeType: m.mime_type,
            url: m.type === 'url' ? m.content : undefined,
            fileUrl: m.type === 'file' ? `/uploads/${m.content}` : undefined
        }));

    // Načtení a sanitizace kvízů
    const [quizRows] = await pool.execute(
        `SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount FROM quizzes q WHERE q.course_id = ? ORDER BY q.created_at DESC`,
        [courseData.id]
    );
    const quizzes = [];
    for (const qRow of (quizRows as any[])) {
        if (!qRow) continue;
        const [questionRows] = await pool.execute("SELECT * FROM quiz_questions WHERE quiz_id = ?", [qRow.id]);
        const questions = (questionRows as any[]).map(q => {
            if (!q) return null;
            const options = parseJson(q.options) || [];
            const correctAnswer = parseJson(q.correct_answer);
            const base = { uuid: q.uuid, type: q.type, question: q.question, options };
            return q.type === 'singleChoice' ? { ...base, correctIndex: correctAnswer } : { ...base, correctIndices: correctAnswer };
        }).filter(q => q); // Odstranění null otázek
        
        quizzes.push({ uuid: qRow.uuid, title: qRow.title, attemptsCount: qRow.attemptsCount || 0, questions });
    }

    // Načtení feedu
    const [feedRows] = await pool.execute(
        "SELECT * FROM feed_events WHERE course_id = ? ORDER BY created_at DESC", 
        [courseData.id]
    );
    const feed = (feedRows as any[]).map(row => ({
        uuid: row.uuid,
        type: row.type === 'message' ? 'manual' : row.type,
        message: row.content, 
        author: row.author,
        edited: !!row.is_edited,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    return {
        uuid: courseData.uuid,
        name: courseData.name,
        description: courseData.description,
        difficulty: courseData.difficulty || "",
        materials,
        quizzes,
        feed
    };
};

// GET /courses (Seznam kurzů)
coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses ORDER BY created_at DESC");
        const courses = [];

        for (const row of (rows as any[])) {
            // Zjednodušený fetch pro seznam (bez detailů kvízů a feedu)
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

            const [quizRows] = await pool.execute(
                `SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount FROM quizzes q WHERE q.course_id = ?`,
                [row.id]
            );
            const quizzes = [];
            for (const qRow of (quizRows as any[])) {
                // Pro seznam stačí základní info o kvízech
                const [questionRows] = await pool.execute("SELECT * FROM quiz_questions WHERE quiz_id = ?", [qRow.id]);
                const questions = (questionRows as any[]).map(q => {
                    const options = parseJson(q.options);
                    const correctAnswer = parseJson(q.correct_answer);
                    const base = { uuid: q.uuid, type: q.type, question: q.question, options };
                    return q.type === 'singleChoice' ? { ...base, correctIndex: correctAnswer } : { ...base, correctIndices: correctAnswer };
                });
                quizzes.push({ uuid: qRow.uuid, title: qRow.title, attemptsCount: qRow.attemptsCount || 0, questions });
            }

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

// POST /courses (Vytvoření kurzu)
coursesRouter.post("/", async (req: Request, res: Response) => {
    if (!req.body || !req.body.name) {
        res.status(400).json({ error: "Missing data" });
        return;
    }
    const uuid = uuidv4();
    const { name, description = "", difficulty = "" } = req.body;
    try {
        // 1. Vytvoření kurzu
        const [result] = await pool.execute(
            "INSERT INTO courses (uuid, name, description, difficulty) VALUES (?, ?, ?, ?)",
            [uuid, name, description, difficulty]
        );
        const courseId = (result as any).insertId;

        // 2. Automatická zpráva do feedu
        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový kurz: ${name}`;

            // 2a. Zápis do DB feedu
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                [feedUuid, courseId, "system", feedContent, null]
            );

            // 2b. Odeslání přes SSE
            broadcastToCourse(uuid, {
                uuid: feedUuid,
                type: "system",
                message: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("[Courses] Nepodařilo se zapsat do feedu:", feedError);
        }

        res.status(201).json({ uuid, name, description, difficulty, materials: [], quizzes: [], feed: [] });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId (OPRAVENO - Používá bezpečnou funkci)
coursesRouter.get("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    try {
        const course = await getFullCourseData(courseId);
        if (!course) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        res.status(200).json(course);
    } catch (error) {
        console.error("Error fetching course detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT /courses/:courseId (OPRAVENO - Vrací kompletní data)
coursesRouter.put("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { name, description, difficulty } = req.body;
    try {
        // 1. Aktualizace kurzu
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ?, difficulty = ? WHERE uuid = ?",
            [name, description, difficulty || "", courseId]
        );
        if ((result as any).affectedRows === 0) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        // 2. Automatická zpráva do feedu
        try {
            const [courseRows] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [courseId]);
            if ((courseRows as any[]).length > 0) {
                const courseIntId = (courseRows as any[])[0].id;
                const feedUuid = uuidv4();
                const feedContent = `Kurz aktualizován: ${name}`;

                // 2a. Zápis do DB feedu
                await pool.execute(
                    "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                    [feedUuid, courseIntId, "system", feedContent, null]
                );

                // 2b. Odeslání přes SSE
                broadcastToCourse(courseId, {
                    uuid: feedUuid,
                    type: "system",
                    message: feedContent,
                    createdAt: new Date(),
                    isEdited: false
                });
            }
        } catch (feedError) {
            console.error("[Courses] Nepodařilo se zapsat aktualizaci do feedu:", feedError);
        }

        // 3. VRÁCENÍ KOMPLETNÍCH DAT (KLÍČOVÁ OPRAVA)
        // Místo prázdných polí vrátíme skutečný stav databáze
        const updatedCourse = await getFullCourseData(courseId);
        res.status(200).json(updatedCourse);
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