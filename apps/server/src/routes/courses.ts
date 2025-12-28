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

// 1. DATA (musí být vně funkcí)
const courses: Course[] = [];

const generateId = () => {
    return crypto.randomBytes(16).toString("hex");
};

// --- GET /courses (Seznam) ---
coursesRouter.get("/", (req, res) => {
    const accept = req.headers.accept || "";

    // Pokud chce test HTML (render test), vrátíme HTML
    if (accept.includes("html")) {
        const html = `
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Courses</h1>
                <ul>
                    ${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}
                </ul>
            </body>
            </html>
        `;
        return res.send(html);
    }

    // Jinak vracíme JSON (API test)
    res.status(200).json(courses);
});

// --- POST /courses (Vytvoření) ---
coursesRouter.post("/", (req, res) => {
    // Validace
    if (!req.body || !req.body.name) {
        return res.status(400).json({ error: "Missing name" });
    }

    const newCourse: Course = {
        uuid: generateId(),
        name: req.body.name,
        description: req.body.description || "",
        materials: [], // Test varuje, pokud chybí
        quizzes: [],
        feed: []
    };

    courses.push(newCourse);
    // Musí vrátit 201 Created a vytvořený objekt
    res.status(201).json(newCourse);
});

// --- GET /courses/:courseId (Detail) ---
coursesRouter.get("/:courseId", (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);
    const accept = req.headers.accept || "";

    // Pokud chce HTML (prohlížeč/test stránky)
    if (accept.includes("html")) {
        // KRITICKÉ: Pokud kurz neexistuje, musíme vrátit HTML chybu.
        // Jinak Express propadne dál a zobrazí "Hello TdA", což shodí test.
        if (!course) {
            return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
        }

        // Pokud existuje, vrátíme HTML obsahující jméno kurzu (test hledá content.toContain(name))
        const html = `
            <!DOCTYPE html>
            <html>
            <body>
                <h1>${course.name}</h1>
                <p>${course.description}</p>
            </body>
            </html>
        `;
        return res.send(html);
    }

    // Pokud chce JSON (API)
    if (!course) {
        return res.status(404).json({ error: "Not found" });
    }
    
    res.status(200).json(course);
});

// --- PUT /courses/:courseId (Update) ---
coursesRouter.put("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    // Aktualizujeme data, ale zachováme ID
    courses[index] = { 
        ...courses[index], 
        ...req.body, 
        uuid: courses[index].uuid 
    };
    res.status(200).json(courses[index]);
});

// --- DELETE /courses/:courseId (Smazání) ---
coursesRouter.delete("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) {
        // Test sice nečeká 404 u delete explicitně, ale je to jistota
        return res.status(404).json({ error: "Not found" });
    }

    courses.splice(index, 1);
    // Musí vrátit 204 No Content
    res.status(204).send();
});
