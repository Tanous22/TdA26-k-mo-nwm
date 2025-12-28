import { Router } from "express";
import crypto from "crypto";

export const coursesRouter = Router();

// Definice typu pro TypeScript
interface Course {
    uuid: string;
    name: string;
    description: string;
    materials: string[];
    quizzes: string[];
    feed: string[];
}

// In-memory databáze
const courses: Course[] = [];

// Pomocná funkce pro bezpečné generování ID
const generateId = () => {
    // Pokud je dostupné randomUUID (Node 14.17+), použijeme ho
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback pro starší Node
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses
coursesRouter.get("/", (req, res) => {
    try {
        // Bezpečné zjištění hlavičky (pokud chybí, použijeme prázdný string)
        const acceptHeader = req.headers.accept || "";

        // Pokud chce prohlížeč HTML
        if (acceptHeader.includes("text/html")) {
            const html = `
                <html><body>
                    <h1>Courses</h1>
                    <ul>${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
                </body></html>
            `;
            return res.send(html);
        }

        // Jinak vracíme JSON
        res.status(200).json(courses);
    } catch (error) {
        console.error("GET / error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /courses
coursesRouter.post("/", (req, res) => {
    try {
        console.log("POST body:", req.body); // Debug pro kontrolu

        // Ochrana proti undefined body (pokud chybí express.json middleware)
        if (!req.body) {
            console.error("req.body is undefined! Check app.use(express.json())");
            return res.status(500).json({ error: "Server misconfiguration: missing body parser" });
        }

        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({ error: "Missing name or description" });
        }

        const newCourse: Course = {
            uuid: generateId(),
            name: name,
            description: description,
            materials: [],
            quizzes: [],
            feed: []
        };

        courses.push(newCourse);
        res.status(201).json(newCourse);
    } catch (error) {
        console.error("POST / error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /courses/:courseId
coursesRouter.get("/:courseId", (req, res) => {
    try {
        const { courseId } = req.params;
        const course = courses.find(c => c.uuid === courseId);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const acceptHeader = req.headers.accept || "";
        if (acceptHeader.includes("text/html")) {
            return res.send(`
                <html><body>
                    <h1>${course.name}</h1>
                    <p>${course.description}</p>
                </body></html>
            `);
        }

        res.status(200).json(course);
    } catch (error) {
        console.error("GET /:id error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PUT /courses/:courseId
coursesRouter.put("/:courseId", (req, res) => {
    try {
        const { courseId } = req.params;
        const index = courses.findIndex(c => c.uuid === courseId);

        if (index === -1) {
            return res.status(404).json({ error: "Course not found" });
        }

        // Ochrana proti undefined body
        const updates = req.body || {};

        courses[index] = {
            ...courses[index],
            name: updates.name || courses[index].name,
            description: updates.description || courses[index].description
        };

        res.status(200).json(courses[index]);
    } catch (error) {
        console.error("PUT /:id error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE /courses/:courseId
coursesRouter.delete("/:courseId", (req, res) => {
    try {
        const { courseId } = req.params;
        const index = courses.findIndex(c => c.uuid === courseId);

        if (index === -1) {
            return res.status(404).json({ error: "Course not found" });
        }

        courses.splice(index, 1);
        res.status(204).send();
    } catch (error) {
        console.error("DELETE /:id error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
