import { Router } from "express";
import crypto from "crypto";

export const coursesRouter = Router();

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

// Pomocná funkce pro ID
const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses (Seznam)
coursesRouter.get("/", (req, res) => {
    // 1. Pokud klient akceptuje HTML (prohlížeč/test stránky), vrátíme HTML přednostně
    if (req.accepts('html')) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Courses</title></head>
            <body>
                <h1>Courses</h1>
                <ul>${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
            </body>
            </html>
        `;
        return res.send(html);
    }
    
    // 2. Jinak vracíme JSON (pro API testy)
    res.status(200).json(courses);
});

// POST /courses
coursesRouter.post("/", (req, res) => {
    if (!req.body || !req.body.name) {
        return res.status(400).json({ error: "Missing data" });
    }

    const newCourse: Course = {
        uuid: generateId(),
        name: req.body.name,
        description: req.body.description || "",
        materials: [],
        quizzes: [],
        feed: []
    };
    courses.push(newCourse);
    res.status(201).json(newCourse);
});

// GET /courses/:courseId (Detail)
coursesRouter.get("/:courseId", (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);

    // Pokud kurz neexistuje
    if (!course) {
        return res.status(404).json({ error: "Not found" });
    }

    // 1. ZDE BYL PROBLÉM: Použijeme req.accepts('html') pro robustní detekci
    if (req.accepts('html')) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>${course.name}</title></head>
            <body>
                <h1>${course.name}</h1>
                <p>${course.description}</p>
            </body>
            </html>
        `;
        return res.send(html);
    }

    // 2. Jinak JSON
    res.status(200).json(course);
});

// PUT /courses/:courseId
coursesRouter.put("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    courses[index] = { 
        ...courses[index], 
        ...req.body, 
        uuid: courses[index].uuid // ID se nesmí měnit
    };
    res.status(200).json(courses[index]);
});

// DELETE /courses/:courseId
coursesRouter.delete("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    courses.splice(index, 1);
    res.status(204).send();
});
