import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { pool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
import { broadcastToCourse } from "./feed.js";

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/gif",
    "video/mp4",
    "audio/mpeg"
];

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error("UNSUPPORTED_FORMAT"));
        }
        const allowedExtensions = /\.(pdf|docx|txt|png|jpg|jpeg|gif|mp4|mp3)$/i;
        if (!file.originalname.match(allowedExtensions)) {
            return cb(new Error("UNSUPPORTED_FORMAT"));
        }
        cb(null, true);
    }
});

export const materialsRouter = express.Router({ mergeParams: true });

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// GET - Načtení materiálů
materialsRouter.get("/", async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const [courses] = await pool.execute(
            "SELECT id FROM courses WHERE uuid = ? OR id = ?",
            [courseId, courseId]
        );

        if ((courses as any).length === 0) {
            res.status(404).json({ error: "Kurz nenalezen" });
            return;
        }

        const dbCourseId = (courses as any)[0].id;
        const [rows] = await pool.execute(
            `SELECT uuid, type, name, description, content, mime_type, created_at 
             FROM materials 
             WHERE course_id = ? 
             ORDER BY created_at DESC`,
            [dbCourseId]
        );

        const materials = (rows as any).map((m: any) => ({
            uuid: m.uuid,
            type: m.type,
            name: m.name,
            description: m.description,
            mimeType: m.mime_type,
            url: m.type === 'url' ? m.content : undefined,
            // ZDE JE ZMĚNA: Přidáno /api
            fileUrl: m.type === 'file' ? `/api/uploads/${m.content}` : undefined
        }));

        res.json(materials);
    } catch (error) {
        console.error("Chyba GET materials:", error);
        res.status(500).json({ error: "Chyba při načítání" });
    }
});

// POST - Vytvoření materiálu
materialsRouter.post("/", handleUpload, async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { type, name, description, url } = req.body;
        const safeDescription = description || null;
        const file = req.file;

        if (!type || !name) {
             res.status(400).json({ error: "Chybí povinná pole" });
             return;
        }

        const [courses] = await pool.execute(
            "SELECT id FROM courses WHERE uuid = ? OR id = ?",
            [courseId, courseId]
        );

        if ((courses as any).length === 0) {
             res.status(404).json({ error: "Kurz nenalezen" });
             return;
        }

        const dbCourseId = (courses as any)[0].id;
        const newUuid = uuidv4();
        
        let content = "";
        let mimeType = null;

        if (type === "url") {
            content = url || "";
        } else if (type === "file") {
            if (!file) {
                 res.status(400).json({ error: "Chybí soubor" });
                 return;
            }
            content = file.filename;
            mimeType = file.mimetype;
        }

        await pool.execute(
            `INSERT INTO materials (uuid, course_id, type, name, description, content, mime_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newUuid, dbCourseId, type, name, safeDescription, content, mimeType]
        );

        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový studijní materiál: ${name}`;
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [feedUuid, dbCourseId, "system", feedContent, null]
            );
            
            broadcastToCourse(courseId, {
                uuid: feedUuid,
                type: "system",
                message: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("Nepodařilo se zapsat do feedu:", feedError);
        }

        res.status(201).json({
            uuid: newUuid,
            type,
            name,
            description,
            mimeType,
            url: type === 'url' ? content : undefined,
            // ZDE JE ZMĚNA: Přidáno /api
            fileUrl: type === 'file' ? `/api/uploads/${content}` : undefined
        });

    } catch (error) {
        console.error("Chyba POST materials:", error);
        res.status(500).json({ error: "Chyba při ukládání" });
    }
});

// PUT - Úprava materiálu
materialsRouter.put("/:materialId", handleUpload, async (req: Request, res: Response) => {
    try {
        const { materialId, courseId } = req.params;
        const { name, description, url } = req.body;
        const file = req.file;

        const [materials] = await pool.execute(
            "SELECT * FROM materials WHERE uuid = ?",
            [materialId]
        );

        if ((materials as any).length === 0) {
             res.status(404).json({ error: "Materiál nenalezen" });
             return;
        }

        const currentMaterial = (materials as any)[0];
        let newContent = currentMaterial.content;
        let newMimeType = currentMaterial.mime_type;

        if (file) {
            newContent = file.filename;
            newMimeType = file.mimetype;
        } 
        else if (currentMaterial.type === 'url' && url) {
            newContent = url;
        }

        await pool.execute(
            `UPDATE materials 
             SET name = ?, description = ?, content = ?, mime_type = ?
             WHERE uuid = ?`,
            [name || currentMaterial.name, description || currentMaterial.description, newContent, newMimeType, materialId]
        );

        const finalName = name || currentMaterial.name;

        try {
            const feedUuid = uuidv4();
            const feedContent = `Materiál aktualizován: ${finalName}`;
            
            const [courseData] = await pool.execute(
                "SELECT id FROM courses WHERE uuid = ?",
                [courseId]
            );
            const courseIntId = ((courseData as any)?.[0])?.id;

            if (courseIntId) {
                await pool.execute(
                    "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                    [feedUuid, courseIntId, "system", feedContent, null]
                );
                
                broadcastToCourse(courseId, {
                    uuid: feedUuid,
                    type: "system",
                    message: feedContent,
                    createdAt: new Date(),
                    isEdited: false
                });
            }
        } catch (feedError) {
            console.error("[Route] Nepodařilo se zapsat do feedu:", feedError);
        }

        res.json({
            uuid: materialId,
            type: currentMaterial.type,
            name: finalName,
            description: description || currentMaterial.description,
            mimeType: newMimeType,
            url: currentMaterial.type === 'url' ? newContent : undefined,
            // ZDE JE ZMĚNA: Přidáno /api
            fileUrl: currentMaterial.type === 'file' ? `/api/uploads/${newContent}` : undefined
        });

    } catch (error) {
        console.error("Chyba PUT materials:", error);
        res.status(500).json({ error: "Chyba při úpravě" });
    }
});

// DELETE zůstává stejný, tam se URL nevrací
materialsRouter.delete("/:materialId", async (req: Request, res: Response) => {
    try {
        const { materialId, courseId } = req.params;

        const [materials] = await pool.execute(
            "SELECT name, course_id FROM materials WHERE uuid = ?",
            [materialId]
        );

        if ((materials as any).length === 0) {
             res.status(404).json({ error: "Materiál nenalezen" });
             return;
        }

        const materialName = (materials as any)[0].name;

        const [result] = await pool.execute(
            "DELETE FROM materials WHERE uuid = ?",
            [materialId]
        );

        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Materiál nenalezen" });
             return;
        }

        try {
            const feedUuid = uuidv4();
            const feedContent = `Materiál smazán: ${materialName}`;
            
            const [courseData] = await pool.execute(
                "SELECT id FROM courses WHERE uuid = ?",
                [courseId]
            );
            const courseIntId = ((courseData as any)?.[0])?.id;

            if (courseIntId) {
                await pool.execute(
                    "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                    [feedUuid, courseIntId, "system", feedContent, null]
                );
                
                broadcastToCourse(courseId, {
                    uuid: feedUuid,
                    type: "system",
                    message: feedContent,
                    createdAt: new Date(),
                    isEdited: false
                });
            }
        } catch (feedError) {
            console.error("[Route] Nepodařilo se zapsat do feedu:", feedError);
        }

        res.status(204).send();
    } catch (error) {
        console.error("Chyba DELETE materials:", error);
        res.status(500).json({ error: "Chyba při mazání" });
    }
});