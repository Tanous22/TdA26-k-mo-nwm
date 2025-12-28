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

// Tady se data ukládají.
// Test si sem uloží "Course for Detail Page Test".
const courses: Course[] = [];

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// GET /courses (Seznam)
coursesRouter.get("/", (req, res) => {
    const accept = req.headers.accept || "";
    if (accept.includes("html")) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Courses</h1>
                <ul>${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
            </body>
            </html>
        `);
    }
    res.status(200).json(courses);
});

// POST /courses
coursesRouter.post("/", (req, res) => {
    if (!req.body || !req.body.name) return res.status(400).json({ error: "Missing data" });

    const newCourse: Course = {
        uuid: generateId(),
        name: req.body.name,
        description: req.body.description || "",
        materials: [],
        quizzes: [],
        feed: []
    };
    courses.push(newCourse);
    
    // DEBUG: Vypíše do konzole, že jsme kurz uložili
    console.log(`[POST] Uložen kurz: ${newCourse.name} (${newCourse.uuid})`);
    
    res.status(201).json(newCourse);
});

// GET /courses/:courseId (Detail - TADY SE LÁME CHLEBA)
coursesRouter.get("/:courseId", (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);
    const accept = req.headers.accept || "";

    // DEBUG: Vypíše, jestli jsme kurz našli
    console.log(`[GET] Hledám ID: ${courseId}. Našel jsem? ${!!course}. Chce HTML? ${accept.includes("html")}`);

    if (accept.includes("html")) {
        // Pokud kurz v paměti není, vrátíme HTML chybu (ne "Hello TdA")
        if (!course) {
            return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
        }

        // TOTO JE TO ŘEŠENÍ:
        // Vezmeme course.name (což je "Course for Detail Page Test") a vložíme ho do HTML.
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>${course.name}</title></head>
            <body>
                <h1>${course.name}</h1> <p>${course.description}</p>
            </body>
            </html>
        `;
        return res.send(html);
    }

    if (!course) return res.status(404).json({ error: "Not found" });
    res.status(200).json(course);
});

// PUT a DELETE (aby testy neřvaly)
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
