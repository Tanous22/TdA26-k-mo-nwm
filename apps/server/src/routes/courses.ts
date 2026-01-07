import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db/index.js"; // Importujeme pool pro DB spojení

export const coursesRouter = Router();

// Interface držíme pro TypeScript a frontend, i když v DB zatím máme jen část.
interface Course {
    uuid: string;
    name: string;
    description: string;
    materials: string[];
    quizzes: string[];
    feed: string[];
}

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses (Seznam všech kurzů z DB)
coursesRouter.get("/", async (req, res) => {
    try {
        // Vytáhneme data z DB
        const [rows] = await pool.execute("SELECT * FROM courses");
        
        // Namapujeme DB řádky na formát, co čeká frontend (Course interface)
        // Note: materials/quizzes/feed zatím v DB nejsou, vracíme prázdné pole, aby frontend nepadal.
        const courses = (rows as any[]).map(row => ({
            uuid: row.uuid,
            name: row.name,
            description: row.description,
            materials: [], 
            quizzes: [], 
            feed: [] 
        }));

        // Podpora pro HTML request (pokud to testy nebo prohlížeč vyžadují)
        const accept = req.headers.accept || "";
        if (accept.includes("html")) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <body>
                    <h1>Courses</h1>
                    <ul>${courses.map((c: any) => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
                </body>
                </html>
            `);
        }

        // Klasická JSON odpověď
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// POST /courses (Vytvoření kurzu)
coursesRouter.post("/", async (req, res) => {
    if (!req.body || !req.body.name) return res.status(400).json({ error: "Missing data" });

    const uuid = generateId();
    const name = req.body.name;
    const description = req.body.description || "";

    try {
        // INSERT do databáze
        await pool.execute(
            "INSERT INTO courses (uuid, name, description) VALUES (?, ?, ?)",
            [uuid, name, description]
        );

        // Sestavíme objekt odpovědi
        const newCourse: Course = {
            uuid,
            name,
            description,
            materials: [],
            quizzes: [],
            feed: []
        };
        
        console.log(`[POST] Uložen kurz do DB: ${name} (${uuid})`);
        res.status(201).json(newCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// GET /courses/:courseId (Detail kurzu)
coursesRouter.get("/:courseId", async (req, res) => {
    const { courseId } = req.params;
    const accept = req.headers.accept || "";

    try {
        // Hledáme podle UUID
        const [rows] = await pool.execute("SELECT * FROM courses WHERE uuid = ?", [courseId]);
        const result = rows as any[];
        const courseData = result[0]; // První nalezený

        console.log(`[GET] Hledám ID: ${courseId}. Našel v DB? ${!!courseData}.`);

        // Pokud v DB není -> 404
        if (!courseData) {
            if (accept.includes("html")) {
                return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
            }
            return res.status(404).json({ error: "Not found" });
        }

        // Pokud chce HTML
        if (accept.includes("html")) {
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>${courseData.name}</title></head>
                <body>
                    <h1>${courseData.name}</h1> <p>${courseData.description}</p>
                </body>
                </html>
            `;
            return res.send(html);
        }

        // Pokud chce JSON -> vrátíme formát Course
        const course: Course = {
            uuid: courseData.uuid,
            name: courseData.name,
            description: courseData.description,
            materials: [],
            quizzes: [],
            feed: []
        };
        res.status(200).json(course);

    } catch (error) {
        console.error("Error fetching course detail:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// PUT /courses/:courseId (Editace)
coursesRouter.put("/:courseId", async (req, res) => {
    const { courseId } = req.params;
    const { name, description } = req.body;

    try {
        // UPDATE v DB
        const [result] = await pool.execute(
            "UPDATE courses SET name = ?, description = ? WHERE uuid = ?",
            [name, description, courseId]
        );
        
        // Check, jestli se něco změnilo (affectedRows)
        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: "Not found or no change" });
        }

        // Vrátíme aktualizovaná data (musíme je znovu načíst nebo složit)
        // Pro rychlost jen složíme odpověď
        res.status(200).json({ 
            uuid: courseId, 
            name, 
            description,
            materials: [], quizzes: [], feed: [] 
        });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// DELETE /courses/:courseId (Mazání)
coursesRouter.delete("/:courseId", async (req, res) => {
    const { courseId } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM courses WHERE uuid = ?", [courseId]);
        
        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ error: "Database error" });
    }
});