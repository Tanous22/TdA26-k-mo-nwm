import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
import { quizzesRouter } from "./quizzes.js";
import { materialsRouter } from "./materials.js";
import { feedRouter, broadcastToCourse } from "./feed.js";

export const coursesRouter = Router();

coursesRouter.use("/:courseId/quizzes", quizzesRouter);
coursesRouter.use("/:courseId/materials", materialsRouter);
coursesRouter.use("/:courseId/feed", feedRouter);

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
    category: string;
    materials: any[];
    quizzes: any[];
    feed: any[];
}

const getFullCourseData = async (courseId: string) => {
    const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
    const courseData = (rows as any[])[0];
    if (!courseData) return null;

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
            // ZDE JE ZMĚNA 1: Přidáno /api
            fileUrl: m.type === 'file' ? `/api/uploads/${m.content}` : undefined
        }));

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
        }).filter(q => q);

        quizzes.push({ uuid: qRow.uuid, title: qRow.title, attemptsCount: qRow.attemptsCount || 0, questions });
    }

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
        category: courseData.category || "Programování",
        materials,
        quizzes,
        feed
    };
};

coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM courses ORDER BY created_at DESC");
        const courses = [];

        for (const row of (rows as any[])) {
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
                // ZDE JE ZMĚNA 2: Přidáno /api
                fileUrl: m.type === 'file' ? `/api/uploads/${m.content}` : undefined
            }));

            const [quizRows] = await pool.execute(
                `SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount FROM quizzes q WHERE q.course_id = ?`,
                [row.id]
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

            courses.push({
                uuid: row.uuid,
                name: row.name,
                description: row.description,
                difficulty: row.difficulty || "",
                category: row.category || "Programování",
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

// Zbytek souboru zůstává stejný (POST, GET :id, PUT, DELETE)
coursesRouter.post("/", async (req: Request, res: Response) => {
    if (!req.body || !req.body.name) {
        res.status(400).json({ error: "Missing data" });
        return;
    }
    const uuid = uuidv4();
    const { name, description = "", difficulty = "", category = "Programování" } = req.body;

    try {
        const [result] = await pool.execute(
            "INSERT INTO courses (uuid, name, description, difficulty, category) VALUES (?, ?, ?, ?, ?)",
            [uuid, name, description, difficulty, category]
        );
        const courseId = (result as any).insertId;

        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový kurz: ${name}`;
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                [feedUuid, courseId, "system", feedContent, null]
            );
            
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

        res.status(201).json({ uuid, name, description, difficulty, category, materials: [], quizzes: [], feed: [] });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

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

coursesRouter.put("/:courseId", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { name, description, difficulty, category } = req.body;

    try {
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ?, difficulty = ?, category = ? WHERE uuid = ?",
            [name, description, difficulty || "", category || "Programování", courseId]
        );

        if ((result as any).affectedRows === 0) {
            res.status(404).json({ error: "Not found" });
            return;
        }

        try {
            const [courseRows] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [courseId]);
            if ((courseRows as any[]).length > 0) {
                const courseIntId = (courseRows as any[])[0].id;
                const feedUuid = uuidv4();
                const feedContent = `Kurz aktualizován: ${name}`;
                await pool.execute(
                    "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                    [feedUuid, courseIntId, "system", feedContent, null]
                );
                
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

        const updatedCourse = await getFullCourseData(courseId);
        res.status(200).json(updatedCourse);
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

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