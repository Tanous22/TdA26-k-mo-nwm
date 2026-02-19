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

// BEZPEČNÝ PŘEVOD DATA PRO VŠECHNY PROHLÍŽEČE
const formatForMySQL = (dateString: string | null) => {
    if (!dateString) return null;
    const safeDateStr = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const d = new Date(safeDateStr);
    
    if (isNaN(d.getTime())) return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

interface Course {
    uuid: string;
    name: string;
    description: string;
    difficulty: string;
    category: string;
    publishedAt?: string | null;
    endsAt?: string | null;
    materials: any[];
    quizzes: any[];
    feed: any[];
}

const getFullCourseData = async (courseId: string) => {
    const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ? AND deleted_at IS NULL", [courseId]);
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
        publishedAt: courseData.published_at,
        endsAt: courseData.ends_at, // ODESÍLÁNÍ ENDS_AT DO FRONTENDU
        isPaused: Boolean(courseData.is_paused),
        materials,
        quizzes,
        feed
    };
};

// ENDPOINT PRO ARCHIV
coursesRouter.get("/archived/all", async (req: Request, res: Response) => {
    try {
        // Vybere smazané NEBO exspirované kurzy
        const [rows] = await pool.execute(`
            SELECT * FROM courses 
            WHERE deleted_at IS NOT NULL OR (ends_at IS NOT NULL AND ends_at <= NOW()) 
            ORDER BY COALESCE(deleted_at, ends_at) DESC
        `);
        const archivedCourses = (rows as any[]).map(row => ({
            uuid: row.uuid,
            name: row.name,
            description: row.description,
            difficulty: row.difficulty || "",
            category: row.category || "Programování",
            deletedAt: row.deleted_at,
            endsAt: row.ends_at
        }));
        
        res.status(200).json(archivedCourses);
    } catch (error) {
        console.error("Error fetching archived courses:", error);
        res.status(500).json({ error: "Database error" });
    }
});

coursesRouter.get("/", async (req: Request, res: Response) => {
    try {
        // VÝPIS KURZŮ: SCHOVÁ SMAZANÉ A EXSPIROVANÉ
        const [rows] = await pool.execute(`
            SELECT * FROM courses 
            WHERE deleted_at IS NULL AND (ends_at IS NULL OR ends_at > NOW()) 
            ORDER BY created_at DESC
        `);
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
                publishedAt: row.published_at,
                endsAt: row.ends_at, // ODESÍLÁNÍ ENDS_AT DO FRONTENDU
                isPaused: Boolean(row.is_paused),
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

coursesRouter.post("/", async (req: Request, res: Response) => {
    if (!req.body || !req.body.name) {
        res.status(400).json({ error: "Missing data" });
        return;
    }
    const uuid = uuidv4();
    // ZÍSKÁVÁNÍ ENDS_AT Z REQUESTU
    const { name, description = "", difficulty = "", category = "Programování", publishedAt = null, endsAt = null } = req.body;
    
    const mysqlPublishedAt = formatForMySQL(publishedAt);
    const mysqlEndsAt = formatForMySQL(endsAt);

    try {
        // UKLÁDÁNÍ ENDS_AT DO DATABÁZE
        const [result] = await pool.execute(
            "INSERT INTO courses (uuid, name, description, difficulty, category, published_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [uuid, name, description, difficulty, category, mysqlPublishedAt, mysqlEndsAt]
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

        res.status(201).json({ uuid, name, description, difficulty, category, publishedAt: publishedAt || null, endsAt: endsAt || null, materials: [], quizzes: [], feed: [] });
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
    // ZÍSKÁVÁNÍ ENDS_AT Z REQUESTU
    const { name, description, difficulty, category, publishedAt, endsAt } = req.body;
    
    const mysqlPublishedAt = formatForMySQL(publishedAt);
    const mysqlEndsAt = formatForMySQL(endsAt);

    try {
        // AKTUALIZACE ENDS_AT V DATABÁZI
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ?, difficulty = ?, category = ?, published_at = ?, ends_at = ? WHERE uuid = ? AND deleted_at IS NULL",
            [name, description, difficulty || "", category || "Programování", mysqlPublishedAt, mysqlEndsAt, courseId]
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
        const [result] = await pool.execute("UPDATE courses SET deleted_at = NOW() WHERE uuid = ?", [courseId]);
        
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

coursesRouter.post("/:courseId/control", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { action } = req.body;

    if (action !== "pause" && action !== "resume") {
        res.status(400).json({ error: "Neplatná akce. Použijte 'pause' nebo 'resume'." });
        return;
    }

    const isPausedValue = action === "pause" ? 1 : 0;

    try {
        const [result] = await pool.execute(
            "UPDATE courses SET is_paused = ? WHERE uuid = ? AND deleted_at IS NULL",
            [isPausedValue, courseId]
        );

        if ((result as any).affectedRows === 0) {
            res.status(404).json({ error: "Kurz nenalezen nebo je smazán" });
            return;
        }

        res.status(200).json({ 
            message: `Kurz byl úspěšně ${action === "pause" ? "pozastaven" : "spuštěn"}`,
            isPaused: Boolean(isPausedValue) 
        });
    } catch (error) {
        console.error("Error controlling course:", error);
        res.status(500).json({ error: "Database error" });
    }
});