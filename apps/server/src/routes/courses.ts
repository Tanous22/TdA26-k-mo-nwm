import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto'; // Vestavěná knihovna v Node.js

// 1. Definice tvaru dat (Interface)
interface Course {
    uuid: string;
    name: string;
    description: string;
    materials: string[];
    quizzes: string[];
    feed: string[];
}

const router = Router();

// 2. In-memory databáze (pole)
// POZOR: Po restartu serveru se data smažou
const courses: Course[] = [];

// GET /courses (Hybrid: HTML i JSON)
router.get('/', (req: Request, res: Response) => {
    // Pokud chce prohlížeč HTML
    if (req.accepts('html')) {
        const html = `
            <html><body>
                <h1>Courses</h1>
                <ul>${courses.map(c => `<li><a href="/courses/${c.uuid}">${c.name}</a></li>`).join('')}</ul>
            </body></html>
        `;
        return res.send(html);
    }
    // Jinak vracíme data pro testy
    res.json(courses);
});

// POST /courses (Vytvoření)
router.post('/', (req: Request, res: Response) => {
    const newCourse: Course = {
        uuid: randomUUID(),
        name: req.body.name,
        description: req.body.description,
        materials: [],
        quizzes: [],
        feed: []
    };
    courses.push(newCourse);
    res.status(201).json(newCourse);
});

// GET /courses/:courseId (Detail + 404 + HTML)
router.get('/:courseId', (req: Request, res: Response) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.uuid === courseId);

    if (!course) {
        return res.status(404).json({ error: "Course not found" });
    }

    if (req.accepts('html')) {
        return res.send(`
            <html><body>
                <h1>${course.name}</h1>
                <p>${course.description}</p>
            </body></html>
        `);
    }

    res.json(course);
});

// PUT /courses/:courseId (Update)
router.put('/:courseId', (req: Request, res: Response) => {
    const { courseId } = req.params;
    const index = courses.findIndex(c => c.uuid === courseId);

    if (index === -1) {
        return res.status(404).json({ error: "Course not found" });
    }

    // Aktualizace dat (zachováme ID a prázdná pole, pokud nejsou v body)
    courses[index] = {
        ...courses[index],
        name: req.body.name || courses[index].name,
        description: req.body.description || courses[index].description
    };

    res.json(courses[index]);
});

// DELETE /courses/:courseId
router.delete('/:courseId', (req: Request, res: Response) => {
    const { courseId } = req.params;
    const index = courses.findIndex(c => c.uuid === courseId);

    if (index === -1) {
        return res.status(404).json({ error: "Not found" });
    }

    courses.splice(index, 1);
    res.status(204).send();
});

export default router;