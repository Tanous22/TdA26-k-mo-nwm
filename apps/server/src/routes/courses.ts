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

// --- GET SEZNAM ---
coursesRouter.get("/", (req, res) => {
    const accept = req.headers.accept || "";
    
    // DEBUG: Ať vidíme, kdo volá
    console.log(`[GET /courses] Accept: ${accept}, Items: ${courses.length}`);

    // POKUD TO NENÍ JSON REQUEST, VRÁTÍME HTML (Vynucený default)
    if (!accept.includes("json")) {
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
    
    res.status(200).json(courses);
});

// --- POST ---
coursesRouter.post("/", (req, res) => {
    // Rychlá validace
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
    console.log(`[POST] Created course: ${newCourse.uuid}`);
    res.status(201).json(newCourse);
});

// --- GET DETAIL (Tady je problém) ---
coursesRouter.get("/:courseId", (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);
    const accept = req.headers.accept || "";

    // DEBUG: Zjistíme přesně, proč to padá
    console.log(`[GET DETAIL] ID: ${courseId}, Found: ${!!course}, Accept: ${accept}`);

    // OTOČENÁ LOGIKA: Pokud v hlavičce NENÍ slovo "json", posíláme HTML.
    // To zajistí, že prohlížeč (Puppeteer) vždy dostane HTML, i když pošle divné hlavičky.
    if (!accept.includes("json")) {
        // Pokud kurz neexistuje, musíme vrátit HTML chybu, jinak tam skočí "Hello TdA"
        if (!course) {
            console.log("[GET DETAIL] 404 sending HTML error");
            return res.status(404).send("<html><body><h1>Course not found</h1></body></html>");
        }

        console.log("[GET DETAIL] Sending HTML content");
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

    // API Logika
    if (!course) {
        return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(course);
});

// --- PUT ---
coursesRouter.put("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    courses[index] = { ...courses[index], ...req.body, uuid: courses[index].uuid };
    res.status(200).json(courses[index]);
});

// --- DELETE ---
coursesRouter.delete("/:courseId", (req, res) => {
    const index = courses.findIndex(c => c.uuid === req.params.courseId);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    courses.splice(index, 1);
    res.status(204).send();
});
