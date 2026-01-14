import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";

export const quizzesRouter = Router({ mergeParams: true });

// --- POMOCNÉ FUNKCE ---

// Bezpečné parsování JSONu z databáze (kdyby to DB vrátila jako string)
const parseJson = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
};

async function getCourseId(courseUuid: string): Promise<number | null> {
    const [rows] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [courseUuid]);
    if ((rows as any[]).length === 0) return null;
    return (rows as any[])[0].id;
}

// --- ENDPOINTY ---

// GET /courses/:courseId/quizzes - Seznam kvízů
quizzesRouter.get("/", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Course not found" });
            return;
        }

        // 1. Načteme kvízy a rovnou spočítáme pokusy (attemptsCount)
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
                attemptsCount: qRow.attemptsCount || 0, // ZMĚNA: Přidáno attemptsCount podle Swaggeru
                questions: questions
            });
        }

        res.status(200).json(quizzes);

    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses/:courseId/quizzes - Vytvoření kvízu
quizzesRouter.post("/", async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { title, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
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
        const [quizResult] = await pool.execute(
            "INSERT INTO quizzes (uuid, course_id, title) VALUES (?, ?, ?)",
            [quizUuid, dbCourseId, title]
        );
        const newQuizId = (quizResult as any).insertId;

        for (const q of questions) {
            const qUuid = uuidv4();
            let correctAnswer: any = null;
            
            if (q.type === 'singleChoice') {
                correctAnswer = q.correctIndex; 
            } else if (q.type === 'multipleChoice') {
                correctAnswer = q.correctIndices;
            }

            await pool.execute(
                `INSERT INTO quiz_questions (uuid, quiz_id, type, question, options, correct_answer) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    qUuid, 
                    newQuizId, 
                    q.type, 
                    q.question, 
                    JSON.stringify(q.options), 
                    JSON.stringify(correctAnswer)
                ]
            );
        }

        // Odpověď musí obsahovat strukturu Quiz vč. attemptsCount
        res.status(201).json({
            uuid: quizUuid,
            title,
            attemptsCount: 0,
            questions
        });

    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId/quizzes/:quizId - Detail
quizzesRouter.get("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;

    try {
        // Získat kvíz + počet pokusů
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
            attemptsCount: quizData.attemptsCount || 0, // ZMĚNA: Přidáno attemptsCount
            questions: questions
        });

    } catch (error) {
        console.error("Error fetching quiz detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT - Update kvízu
quizzesRouter.put("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { title, questions } = req.body;

    try {
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ?", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Quiz not found" });
            return;
        }
        const dbQuizId = quizData.id;

        await pool.execute("UPDATE quizzes SET title = ? WHERE id = ?", [title, dbQuizId]);
        await pool.execute("DELETE FROM quiz_questions WHERE quiz_id = ?", [dbQuizId]);

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
        }

        // Musíme zjistit aktuální attemptsCount pro odpověď
        const [countRows] = await pool.execute("SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ?", [dbQuizId]);
        const count = (countRows as any)[0].count;

        res.status(200).json({ 
            uuid: quizId, 
            title, 
            attemptsCount: count,
            questions 
        });

    } catch (error) {
        console.error("Error updating quiz:", error);
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

        // Seřadit otázky z DB podle pořadí vložení (nebo podle UUID, pokud na tom záleží - Swagger pořadí neřeší explicitně, ale mapování ano)
        // Pro správné correctPerQuestion musíme iterovat otázky tak, jak jsou v kvízu.
        
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