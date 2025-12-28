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

const courses: Course[] = [];

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses (Seznam)
coursesRouter.get("/", (req, res) => {
    // Agresivní detekce HTML - pokud hlavička obsahuje "html", vrátíme stránku
    const accept = req.headers.accept || "";
    
    if (accept.includes("html")) {
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

    // Agresivní detekce HTML
    const accept = req.headers.accept || "";
    const isHtml = accept.includes("html");

    if (isHtml) {
        // Pokud kurz neexistuje, musíme vrátit HTML chybu, jinak tam skočí "Hello TdA"
        if (!course) {
            return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
        }
        
        // Tady generujeme to dynamické HTML, které test hledá
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

    // JSON API logika
    if (!course) {
        return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(course);
});

// PUT /courses/:courseId
coursesRouter.put("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    courses[index] = { 
        ...courses[index], 
        ...req.body, 
        uuid: courses[index].uuid 
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
