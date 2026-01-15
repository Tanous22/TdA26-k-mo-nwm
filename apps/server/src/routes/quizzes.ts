import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";
// PŘIDÁNO: Import pro vysílání do feedu
import { broadcastToCourse } from "./feed.js";

export const quizzesRouter = Router({ mergeParams: true });

// --- POMOCNÉ FUNKCE ---

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

// --- ENDPOINTY ---

// GET /courses/:courseId/quizzes - Seznam kvízů
quizzesRouter.get("/", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    console.log(`[DEBUG-QUIZ] GET / for course ${courseId}`);

    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Course not found" });
            return;
        }

        const [quizRows] = await pool.execute(`
            SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount
            FROM quizzes q 
            WHERE q.course_id = ? 
            ORDER BY q.created_at DESC
        `, [dbCourseId]);

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

        res.status(200).json(quizzes);

    } catch (error) {
        console.error("[DEBUG-QUIZ] Error fetching quizzes:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses/:courseId/quizzes - Vytvoření kvízu
quizzesRouter.post("/", async (req: Request, res: Response) => {
    console.log("--- [DEBUG-QUIZ] POST / HIT ---");
    const { courseId } = req.params;
    const { title, questions } = req.body;

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
            "INSERT INTO quizzes (uuid, course_id, title) VALUES (?, ?, ?)",
            [quizUuid, dbCourseId, title]
        );
        const newQuizId = (quizResult as any).insertId;
        console.log(`[DEBUG-QUIZ] Quiz created, internal ID: ${newQuizId}`);

        const savedQuestions = [];

        for (const [index, q] of questions.entries()) {
            const qUuid = uuidv4();
            let correctAnswer: any = null;
            
            console.log(`[DEBUG-QUIZ] Processing question ${index + 1} (${q.type})`);

            if (q.type === 'singleChoice') {
                correctAnswer = q.correctIndex; 
            } else if (q.type === 'multipleChoice') {
                correctAnswer = q.correctIndices;
            }

            // Log what we are about to insert
            const optionsStr = JSON.stringify(q.options);
            const correctStr = JSON.stringify(correctAnswer);
            console.log(`[DEBUG-QUIZ] Inserting question: type=${q.type}, options=${optionsStr}, answer=${correctStr}`);

            await pool.execute(
                `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    qUuid, 
                    newQuizId, 
                    q.type, 
                    q.question, 
                    optionsStr, 
                    correctStr
                ]
            );
            
            savedQuestions.push({ ...q, uuid: qUuid });
        }

        console.log("[DEBUG-QUIZ] All questions inserted successfully.");

        // --- PŘIDÁNO: AUTOMATICKÁ UDÁLOST DO FEEDU (FÁZE 4) ---
        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový kvíz: ${title}`;

            // 1. Zápis do DB feedu
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [feedUuid, dbCourseId, "system", feedContent, null]
            );

            // 2. Odeslání přes SSE
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
        // --------------------------------------------------------

        res.status(201).json({
            uuid: quizUuid,
            title,
            attemptsCount: 0,
            questions: savedQuestions
        });

    } catch (error) {
        console.error("[DEBUG-QUIZ] CRITICAL ERROR creating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId/quizzes/:quizId - Detail
quizzesRouter.get("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;

    try {
        const [rows] = await pool.execute(`
            SELECT q.*, (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attemptsCount 
            FROM quizzes q 
            WHERE q.uuid = ?
        `, [quizId]);
        
        const quizData = (rows as any[])[0];

        if (!quizData) {
            res.status(404).json({ error: "Quiz not found" });
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
            questions: questions
        });

    } catch (error) {
        console.error("[DEBUG-QUIZ] Error fetching quiz detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT - Update kvízu
quizzesRouter.put("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { title, questions } = req.body;
    console.log(`[DEBUG-QUIZ] PUT /${quizId} HIT`);

    try {
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ?", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            console.warn(`[DEBUG-QUIZ] Quiz not found for update: ${quizId}`);
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const dbQuizId = quizData.id;

        await pool.execute("UPDATE quizzes SET title = ? WHERE id = ?", [title, dbQuizId]);
        await pool.execute("DELETE FROM quiz_questions WHERE quiz_id = ?", [dbQuizId]);

        const savedQuestions = [];

        for (const q of questions) {
            const qUuid = uuidv4();
            let correctAnswer: any = null;
            if (q.type === 'singleChoice') correctAnswer = q.correctIndex;
            else if (q.type === 'multipleChoice') correctAnswer = q.correctIndices;

            await pool.execute(
                `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [qUuid, dbQuizId, q.type, q.question, JSON.stringify(q.options), JSON.stringify(correctAnswer)]
            );
            savedQuestions.push({ ...q, uuid: qUuid });
        }

        const [countRows] = await pool.execute("SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ?", [dbQuizId]);
        const count = (countRows as any)[0].count;

        console.log(`[DEBUG-QUIZ] Update successful for ${quizId}`);

        res.status(200).json({ 
            uuid: quizId, 
            title, 
            attemptsCount: count,
            questions: savedQuestions
        });

    } catch (error) {
        console.error("[DEBUG-QUIZ] Error updating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE
quizzesRouter.delete("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM quizzes WHERE uuid = ?", [quizId]);
        
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Quiz not found" });
             return;
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// SUBMIT
quizzesRouter.post("/:quizId/submit", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { answers } = req.body;

    try {
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ?", [quizId]);
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