import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/index.js";

// Důležité: mergeParams zajistí, že uvidíme :courseId z nadřazeného routeru
export const quizzesRouter = Router({ mergeParams: true });

// --- POMOCNÉ FUNKCE ---

// Funkce pro získání ID kurzu z UUID (protože v URL je UUID, ale v DB potřebujeme ID)
async function getCourseId(courseUuid: string): Promise<number | null> {
    const [rows] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [courseUuid]);
    if ((rows as any[]).length === 0) return null;
    return (rows as any[])[0].id;
}

// --- ENDPOINTY ---

// GET /courses/:courseId/quizzes - Seznam kvízů v kurzu
quizzesRouter.get("/", async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Kurz nenalezen" });
            return;
        }

        // 1. Načteme všechny kvízy
        const [quizRows] = await pool.execute(
            "SELECT * FROM quizzes WHERE course_id = ? ORDER BY created_at DESC",
            [dbCourseId]
        );

        const quizzes = [];

        // 2. Pro každý kvíz musíme načíst i jeho otázky (Swagger to vyžaduje)
        for (const qRow of (quizRows as any[])) {
            const [questionRows] = await pool.execute(
                "SELECT * FROM quiz_questions WHERE quiz_id = ?",
                [qRow.id]
            );

            // Mapování otázek z DB formátu do API formátu
            const questions = (questionRows as any[]).map(q => {
                const base = {
                    uuid: q.uuid,
                    type: q.type,
                    question: q.question,
                    options: q.options, // MySQL driver to automaticky parsuje z JSONu
                };
                
                // Přidání správné odpovědi podle typu
                if (q.type === 'singleChoice') {
                    return { ...base, correctIndex: q.correct_answer };
                } else {
                    return { ...base, correctIndices: q.correct_answer };
                }
            });

            quizzes.push({
                uuid: qRow.uuid,
                title: qRow.title,
                questions: questions
            });
        }

        res.json(quizzes);

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
         res.status(400).json({ error: "Chybí název nebo otázky" });
         return;
    }

    try {
        const dbCourseId = await getCourseId(courseId);
        if (!dbCourseId) {
            res.status(404).json({ error: "Kurz nenalezen" });
            return;
        }

        // 1. Vytvoříme Kvíz
        const quizUuid = uuidv4();
        const [quizResult] = await pool.execute(
            "INSERT INTO quizzes (uuid, course_id, title) VALUES (?, ?, ?)",
            [quizUuid, dbCourseId, title]
        );
        const newQuizId = (quizResult as any).insertId;

        // 2. Vložíme Otázky
        for (const q of questions) {
            const qUuid = uuidv4();
            // Zjistíme, co uložit jako "correct_answer" (číslo nebo pole čísel)
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

        // Vrátíme vytvořený objekt (pro jednoduchost vracíme to, co přišlo + uuid)
        res.status(201).json({
            uuid: quizUuid,
            title,
            questions
        });

    } catch (error) {
        console.error("Error creating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId/quizzes/:quizId - Detail kvízu
quizzesRouter.get("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;

    try {
        // 1. Najdeme kvíz
        const [rows] = await pool.execute("SELECT * FROM quizzes WHERE uuid = ?", [quizId]);
        const quizData = (rows as any[])[0];

        if (!quizData) {
            res.status(404).json({ error: "Kvíz nenalezen" });
            return;
        }

        // 2. Najdeme otázky
        const [questionRows] = await pool.execute(
            "SELECT * FROM quiz_questions WHERE quiz_id = ?",
            [quizData.id]
        );

        const questions = (questionRows as any[]).map(q => {
            const base = {
                uuid: q.uuid,
                type: q.type,
                question: q.question,
                options: q.options,
            };
            if (q.type === 'singleChoice') {
                return { ...base, correctIndex: q.correct_answer };
            } else {
                return { ...base, correctIndices: q.correct_answer };
            }
        });

        res.json({
            uuid: quizData.uuid,
            title: quizData.title,
            questions: questions
        });

    } catch (error) {
        console.error("Error fetching quiz detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT /courses/:courseId/quizzes/:quizId - Editace kvízu
quizzesRouter.put("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { title, questions } = req.body;

    try {
        // 1. Získáme ID kvízu
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ?", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Kvíz nenalezen" });
            return;
        }
        const dbQuizId = quizData.id;

        // 2. Aktualizujeme název
        await pool.execute("UPDATE quizzes SET title = ? WHERE id = ?", [title, dbQuizId]);

        // 3. Aktualizujeme otázky 
        // Strategie: Smažeme staré a vložíme nové (nejjednodušší řešení pro update struktury)
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

        res.json({ uuid: quizId, title, questions });

    } catch (error) {
        console.error("Error updating quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE /courses/:courseId/quizzes/:quizId - Smazání
quizzesRouter.delete("/:quizId", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM quizzes WHERE uuid = ?", [quizId]);
        
        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Kvíz nenalezen" });
             return;
        }
        // Díky ON DELETE CASCADE v databázi se smažou i otázky a pokusy
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses/:courseId/quizzes/:quizId/submit - Odevzdání a vyhodnocení
quizzesRouter.post("/:quizId/submit", async (req: Request, res: Response) => {
    const { quizId } = req.params;
    const { answers } = req.body; // Pole odpovědí od uživatele

    try {
        // 1. Načteme kvíz a SPRÁVNÉ odpovědi z DB
        const [rows] = await pool.execute("SELECT id FROM quizzes WHERE uuid = ?", [quizId]);
        const quizData = (rows as any[])[0];
        if (!quizData) {
            res.status(404).json({ error: "Kvíz nenalezen" });
            return;
        }

        const [questionRows] = await pool.execute(
            "SELECT uuid, type, correct_answer FROM quiz_questions WHERE quiz_id = ?",
            [quizData.id]
        );
        const dbQuestions = questionRows as any[];

        // 2. Vyhodnocení
        let score = 0;
        const maxScore = dbQuestions.length;
        const correctPerQuestion: boolean[] = [];

        // Projdeme otázky z DB a hledáme k nim odpověď od uživatele
        for (const dbQ of dbQuestions) {
            const userAnswer = answers.find((a: any) => a.uuid === dbQ.uuid);
            let isCorrect = false;

            if (userAnswer) {
                if (dbQ.type === 'singleChoice') {
                    // Porovnáme indexy (DB: 1 vs User: 1)
                    isCorrect = dbQ.correct_answer === userAnswer.selectedIndex;
                } else if (dbQ.type === 'multipleChoice') {
                    // Porovnáme pole. Musíme je seřadit a převést na string pro snadné porovnání.
                    const dbArr = (dbQ.correct_answer as number[]).sort().toString();
                    const userArr = (userAnswer.selectedIndices as number[] || []).sort().toString();
                    isCorrect = dbArr === userArr;
                }
            }

            if (isCorrect) score++;
            correctPerQuestion.push(isCorrect);
        }

        // 3. Uložíme výsledek (Pokus)
        const attemptUuid = uuidv4();
        await pool.execute(
            `INSERT INTO quiz_attempts (uuid, quiz_id, score, max_score, answers) 
             VALUES (?, ?, ?, ?, ?)`,
            [attemptUuid, quizData.id, score, maxScore, JSON.stringify(answers)]
        );

        // 4. Vrátíme výsledek
        res.json({
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