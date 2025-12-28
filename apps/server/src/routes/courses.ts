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

// Data musí být mimo funkce, aby přežila mezi requesty
const courses: Course[] = [];

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses (Seznam)
coursesRouter.get("/", (req, res) => {
    const accept = req.headers.accept || "";
    
    // Pokud je to HTML request (prohlížeč)
    if (accept.includes("html")) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Courses</title></head>
            <body>
                <h1>Courses</h1>
                <ul>${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
            </body>
            </html>
        `);
    }
    
    // JSON
    res.status(200).json(courses);
});

// POST /courses
coursesRouter.post("/", (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: "Missing name" });

    const newCourse: Course = {
        uuid: generateId(),
        name: req.body.name,
        description: req.body.description || "",
        materials: [],
        quizzes: [],
        feed: []
    };
    courses.push(newCourse);
    
    console.log("Created course:", newCourse.uuid); // Debug log
    res.status(201).json(newCourse);
});

// GET /courses/:courseId (Detail)
coursesRouter.get("/:courseId", (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);
    
    const accept = req.headers.accept || "";
    const isHtml = accept.includes("html");

    console.log(`GET request for ${courseId}, Found: ${!!course}, HTML: ${isHtml}`);

    if (isHtml) {
        // ZÁSADNÍ OPRAVA: Pokud kurz neexistuje, musíme vrátit HTML chybu.
        // Kdybychom vrátili nic nebo nechali Express dělat svoji práci, 
        // skočí tam ta "Hello TdA" stránka.
        if (!course) {
            return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
        }

        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>${course.name}</title></head>
            <body>
                <h1>${course.name}</h1>
                <p>${course.description}</p>
            </body>
            </html>
        `);
    }

    // API JSON odpověď
    if (!course) {
        return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(course);
});

// PUT & DELETE (zkráceno, protože fungují)
coursesRouter.put("/:courseId", (req, res) => {
    const idx = courses.findIndex(c => c.uuid === req.params.courseId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    courses[idx] = { ...courses[idx], ...req.body, uuid: courses[idx].uuid };
    res.status(200).json(courses[idx]);
});

coursesRouter.delete("/:courseId", (req, res) => {
    const idx = courses.findIndex(c => c.uuid === req.params.courseId);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    courses.splice(idx, 1);
    res.status(204).send();
});
