import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
import { broadcastToCourse } from "./feed.js";
export const quizzesRouter = Router({ mergeParams: true });
const parseJson = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
};
async function getCourseId(courseUuid: string): Promise<number | null> {
    console.log(`[DEBUG-QUIZ] Resolving internal ID for course UUID: ${courseUuid}`);
    const [rows] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [courseUuid]);
    if ((rows as any[]).length === 0) {
        console.warn(`[DEBUG-QUIZ] Course not found for UUID: ${courseUuid}`);
        return null;
    }
    const id = (rows as any[])[0].id;
    console.log(`[DEBUG-QUIZ] Found internal ID: ${id}`);
    return id;
}
quizzesRouter.get("/", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    console.log(`[DEBUG-QUIZ] GET / for course ${courseId}`);
    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Course not found" });
            return;
        }

        // Check if user is a teacher/lecturer (this assumes auth middleware adds user to request)
        const isTeacher = (req as any).user?.role === 'teacher' || (req as any).user?.role === 'admin';

        const [quizRows] = await pool.execute(`
            SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount
            FROM quizzes q 
            WHERE q.course_id = ? AND q.deleted_at IS NULL
            ORDER BY q.created_at DESC
        `, [dbCourseId]);

        const quizzes = [];
        const now = new Date();

        for (const qRow of (quizRows as any[])) {
            // Filter out unpublished quizzes (unless user is teacher)
            if (!isTeacher && qRow.published_at && new Date(qRow.published_at) > now) {
                continue;
            }

            // Filter out scheduled quizzes in the future (unless user is teacher)
            if (qRow.scheduled_at && new Date(qRow.scheduled_at) > now && !isTeacher) {
                continue;
            }

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

            // Determine quiz status
            let status = 'ACTIVE';
            if (qRow.started_at && qRow.duration_minutes) {
                const endTime = new Date(qRow.started_at);
                endTime.setMinutes(endTime.getMinutes() + qRow.duration_minutes);
                if (endTime < now) {
                    status = 'ARCHIVED';
                }
            }

            quizzes.push({
                uuid: qRow.uuid,
                title: qRow.title,
                attemptsCount: qRow.attemptsCount || 0,
                questions: questions,
                status: status,
                scheduledAt: qRow.scheduled_at,
                scheduledEnd: qRow.scheduled_end_at,
                durationMinutes: qRow.duration_minutes,
                isPaused: qRow.is_paused,
                startedAt: qRow.started_at,
                publishedAt: qRow.published_at
            });
        }

        res.status(200).json(quizzes);
    } catch (error) {
        console.error("[DEBUG-QUIZ] Error fetching quizzes:", error);
        res.status(500).json({ error: "Database error" });
    }
});
quizzesRouter.post("/", async (req: Request, res: Response) => {
    console.log("--- [DEBUG-QUIZ] POST / HIT ---");
    const { courseId } = req.params;
    const { title, questions, scheduledAt, scheduledEnd, durationMinutes, publishedAt } = req.body;
    console.log("Params courseId:", courseId);
    console.log("Body title:", title);
    console.log("Body questions count:", questions?.length);
    if (!title || !questions || !Array.isArray(questions)) {
         console.error("[DEBUG-QUIZ] Validation failed: Missing title or questions is not array");
         res.status(400).json({ error: "Missing title or questions" });
         return;
    }
    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Course not found" });
            return;
        }
        const quizUuid = uuidv4();
        console.log(`[DEBUG-QUIZ] Creating quiz '${title}' with UUID ${quizUuid}`);
        const [quizResult] = await pool.execute(
            "INSERT INTO quizzes (uuid, course_id, title, scheduled_at, scheduled_end_at, duration_minutes, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [quizUuid, dbCourseId, title, scheduledAt || null, scheduledEnd || null, durationMinutes || null, publishedAt || null]
        );
        const newQuizId = (quizResult as any).insertId;
        console.log(`[DEBUG-QUIZ] Quiz created, internal ID: ${newQuizId}`);
        const savedQuestions = [];
        for (const [index, q] of questions.entries()) {
            const qUuid = uuidv4();
            let correctAnswer: any = null;
            console.log(`[DEBUG-QUIZ] Processing question ${index + 1} (${q.type})`);
            if (q.type === 'singleChoice') {
                correctAnswer = q.correctIndex ?? 0; // Default 0
            } else if (q.type === 'multipleChoice') {
                correctAnswer = q.correctIndices || []; // Default []
            }
            const safeQuestion = q.question || ""; // Default prázdný string
            const safeOptions = JSON.stringify(q.options || []); // Default prázdné pole
            const safeCorrectAnswer = JSON.stringify(correctAnswer);
            console.log(`[DEBUG-QUIZ] Inserting question: type=${q.type}, options=${safeOptions}, answer=${safeCorrectAnswer}`);
            await pool.execute(
                `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    qUuid, 
                    newQuizId, 
                    q.type || 'singleChoice', // Pojistka typu
                    safeQuestion, 
                    safeOptions, 
                    safeCorrectAnswer
                ]
            );
            savedQuestions.push({ ...q, uuid: qUuid });
        }
        console.log("[DEBUG-QUIZ] All questions inserted successfully.");
        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový kvíz: ${title}`;
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [feedUuid, dbCourseId, "system", feedContent, null]
            );
            broadcastToCourse(courseId, {
                uuid: feedUuid,
                type: "system",
                message: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("[DEBUG-QUIZ] Nepodařilo se zapsat do feedu:", feedError);
        }
        res.status(201).json({
            uuid: quizUuid,
            title,
            attemptsCount: 0,
            questions: savedQuestions,
            scheduledAt: scheduledAt || null,
            scheduledEnd: scheduledEnd || null,
            durationMinutes: durationMinutes || null,
            publishedAt: publishedAt || null
        });
    } catch (error) {
        console.error("[DEBUG-QUIZ] CRITICAL ERROR creating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});
quizzesRouter.get("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { courseId } = req.query;
    const user = (req as any).user;
    console.log(`[DEBUG-QUIZ] GET Detail for ${quizId}`);
    try {
        const [rows] = await pool.execute(`
            SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount 
            FROM quizzes q 
            WHERE q.uuid = ? AND q.deleted_at IS NULL
        `, [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            console.warn(`[DEBUG-QUIZ] Quiz not found for UUID ${quizId}`);
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        // Check if student can access this quiz (published or they are teacher)
        if (user && !user.isTeacher && quizData.published_at && new Date(quizData.published_at) > new Date()) {
            console.warn(`[DEBUG-QUIZ] Student accessing unpublished quiz ${quizId}`);
            res.status(403).json({ error: "Quiz not yet published" });
            return;
        }
        const [questionRows] = await pool.execute(
            "SELECT * FROM quiz_questions WHERE quiz_id = ?",
            [quizData.id]
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
        res.status(200).json({
            uuid: quizData.uuid,
            title: quizData.title,
            attemptsCount: quizData.attemptsCount || 0,
            questions: questions,
            scheduledAt: quizData.scheduled_at,
            scheduledEnd: quizData.scheduled_end_at,
            durationMinutes: quizData.duration_minutes,
            isPaused: quizData.is_paused,
            startedAt: quizData.started_at,
            publishedAt: quizData.published_at
        });
    } catch (error) {
        console.error("[DEBUG-QUIZ] Error fetching quiz detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});
quizzesRouter.put("/:quizId", async (req: Request, res: Response) => {
    const { quizId, courseId } = req.params;
    const { title, questions, scheduledAt, durationMinutes, publishedAt } = req.body;
    console.log(`[DEBUG-QUIZ] PUT /${quizId} HIT - Smart Update`);
    try {
        const [rows] = await pool.execute("SELECT id, course_id FROM quizzes WHERE uuid = ? AND deleted_at IS NULL", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const dbQuizId = quizData.id;
        const courseIntId = quizData.course_id;
        await pool.execute(
            "UPDATE quizzes SET title = ?, scheduled_at = ?, scheduled_end_at = ?, duration_minutes = ?, published_at = ? WHERE id = ?", 
            [title, scheduledAt || null, scheduledEnd || null, durationMinutes || null, publishedAt || null, dbQuizId]
        );
        const [existingRows] = await pool.execute("SELECT uuid FROM quiz_questions WHERE quiz_id = ?", [dbQuizId]);
        const existingUuids = (existingRows as any[]).map(r => r.uuid);
        const keptUuids: string[] = []; 
        const savedQuestions = [];
        for (const q of questions) {
            let correctAnswer: any = null;
            if (q.type === 'singleChoice') correctAnswer = q.correctIndex ?? 0;
            else if (q.type === 'multipleChoice') correctAnswer = q.correctIndices || [];
            const safeQuestion = q.question || ""; 
            const optionsStr = JSON.stringify(q.options || []);
            const correctStr = JSON.stringify(correctAnswer);
            if (q.uuid && existingUuids.includes(q.uuid)) {
                console.log(`[DEBUG-QUIZ] Updating question ${q.uuid}`);
                await pool.execute(
                    `UPDATE quiz_questions 
                     SET type = ?, question = ?, options = ?, correct_answer = ? 
                     WHERE uuid = ? AND quiz_id = ?`,
                    [q.type, safeQuestion, optionsStr, correctStr, q.uuid, dbQuizId]
                );
                keptUuids.push(q.uuid);
                savedQuestions.push(q); 
            } else {
                const newUuid = uuidv4();
                console.log(`[DEBUG-QUIZ] Inserting new question ${newUuid}`);
                await pool.execute(
                    `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [newUuid, dbQuizId, q.type, safeQuestion, optionsStr, correctStr]
                );
                savedQuestions.push({ ...q, uuid: newUuid });
            }
        }
        const toDelete = existingUuids.filter(id => !keptUuids.includes(id));
        if (toDelete.length > 0) {
            console.log(`[DEBUG-QUIZ] Deleting ${toDelete.length} removed questions`);
            const placeholders = toDelete.map(() => '?').join(',');
            await pool.execute(
                `DELETE FROM quiz_questions WHERE uuid IN (${placeholders}) AND quiz_id = ?`,
                [...toDelete, dbQuizId]
            );
        }
        const [countRows] = await pool.execute("SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ?", [dbQuizId]);
        const count = (countRows as any)[0].count;
        try {
            const feedUuid = uuidv4();
            const feedContent = `Kvíz aktualizován: ${title}`;
            if (courseIntId) {
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
            console.error("[DEBUG-QUIZ] Nepodařilo se zapsat aktualizaci do feedu:", feedError);
        }
        res.status(200).json({ 
            uuid: quizId, 
            title, 
            attemptsCount: count,
            questions: savedQuestions,
            scheduledAt: scheduledAt || null,
            durationMinutes: durationMinutes || null,
            publishedAt: publishedAt || null
        });
    } catch (error) {
        console.error("[DEBUG-QUIZ] Error updating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});
quizzesRouter.delete("/:quizId", async (req: Request, res: Response) => {
    const { quizId, courseId } = req.params;
    try {
        const [quizRows] = await pool.execute("SELECT title, course_id FROM quizzes WHERE uuid = ? AND deleted_at IS NULL", [quizId]);
        if ((quizRows as any[]).length === 0) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const quizTitle = (quizRows as any[])[0].title;
        const quizCourseId = (quizRows as any[])[0].course_id;
        
        // Soft delete: set deleted_at instead of actually deleting
        const [result] = await pool.execute("UPDATE quizzes SET deleted_at = NOW() WHERE uuid = ?", [quizId]);
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Quiz not found" });
             return;
        }
        try {
            const feedUuid = uuidv4();
            const feedContent = `Kvíz smazán: ${quizTitle}`;
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                [feedUuid, quizCourseId, "system", feedContent, null]
            );
            broadcastToCourse(courseId, {
                uuid: feedUuid,
                type: "system",
                message: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("[DEBUG-QUIZ] Nepodařilo se zapsat mazání do feedu:", feedError);
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});
quizzesRouter.post("/:quizId/submit", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { answers } = req.body;
    try {
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ? AND deleted_at IS NULL", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const [questionRows] = await pool.execute(
            "SELECT uuid, type, correct_answer FROM quiz_questions WHERE quiz_id = ?",
            [quizData.id]
        );
        const dbQuestions = questionRows as any[];
        let score = 0;
        const maxScore = dbQuestions.length;
        const correctPerQuestion: boolean[] = [];
        for (const dbQ of dbQuestions) {
            const correctAnswer = parseJson(dbQ.correct_answer);
            const userAnswer = answers.find((a: any) => a.uuid === dbQ.uuid);
            let isCorrect = false;
            if (userAnswer) {
                if (dbQ.type === 'singleChoice') {
                    isCorrect = correctAnswer === userAnswer.selectedIndex;
                } else if (dbQ.type === 'multipleChoice') {
                    const dbArr = (correctAnswer as number[]).sort().toString();
                    const userArr = (userAnswer.selectedIndices as number[] || []).sort().toString();
                    isCorrect = dbArr === userArr;
                }
            }
            if (isCorrect) score++;
            correctPerQuestion.push(isCorrect);
        }
        const attemptUuid = uuidv4();
        await pool.execute(
            `INSERT INTO quiz_attempts (uuid, quiz_id, score, max_score, answers) 
             VALUES (?, ?, ?, ?, ?)`,
            [attemptUuid, quizData.id, score, maxScore, JSON.stringify(answers)]
        );
        res.status(200).json({
            quizUuid: quizId,
            score,
            maxScore,
            correctPerQuestion,
            submittedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

quizzesRouter.post("/:quizId/control", async (req: Request, res: Response) => {
    const { quizId, courseId } = req.params;
    const { action } = req.body;

    if (!['start', 'pause', 'resume'].includes(action)) {
        res.status(400).json({ error: "Invalid action. Must be 'start', 'pause', or 'resume'." });
        return;
    }

    try {
        const [rows] = await pool.execute("SELECT id, title, course_id FROM quizzes WHERE uuid = ? AND deleted_at IS NULL", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }

        const dbQuizId = quizData.id;
        const quizTitle = quizData.title;
        const dbCourseId = quizData.course_id;
        let updateQuery = "";
        let params: any[] = [];

        if (action === 'start') {
            updateQuery = "UPDATE quizzes SET started_at = NOW(), is_paused = 0 WHERE id = ?";
            params = [dbQuizId];
        } else if (action === 'pause') {
            updateQuery = "UPDATE quizzes SET is_paused = 1 WHERE id = ?";
            params = [dbQuizId];
        } else if (action === 'resume') {
            updateQuery = "UPDATE quizzes SET is_paused = 0 WHERE id = ?";
            params = [dbQuizId];
        }

        await pool.execute(updateQuery, params);

        const [updatedRows] = await pool.execute("SELECT * FROM quizzes WHERE id = ? AND deleted_at IS NULL", [dbQuizId]);
        const updatedQuiz = (updatedRows as any[])[0];

        // Add system message to feed
        try {
            const feedUuid = uuidv4();
            let feedContent = '';
            if (action === 'start') {
                feedContent = `✅ Kvíz spuštěn: ${quizTitle}`;
            } else if (action === 'pause') {
                feedContent = `⏸️ Kvíz pozastaven: ${quizTitle}`;
            } else if (action === 'resume') {
                feedContent = `▶️ Kvíz pokračuje: ${quizTitle}`;
            }
            
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [feedUuid, dbCourseId, "system", feedContent, null]
            );
            
            broadcastToCourse(courseId, {
                uuid: feedUuid,
                type: "system",
                message: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("[DEBUG-QUIZ] Nepodařilo se zapsat kontrolu do feedu:", feedError);
        }

        res.status(200).json({
            uuid: quizId,
            action,
            status: updatedQuiz.is_paused ? 'PAUSED' : 'ACTIVE',
            startedAt: updatedQuiz.started_at,
            isPaused: updatedQuiz.is_paused
        });
    } catch (error) {
        console.error("[DEBUG-QUIZ] Error controlling quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});
