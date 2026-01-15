import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { pool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
// PŘIDÁNO: Import pro vysílání do feedu
import { broadcastToCourse } from "./feed.js";

const ALLOWED_MIME_TYPES = [
    "application/pdf",                                                      // .pdf
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "text/plain",                                                           // .txt
    "image/png",                                                            // .png
    "image/jpeg",                                                           // .jpg, .jpeg
    "image/gif",                                                            // .gif
    "video/mp4",                                                            // .mp4
    "audio/mpeg"                                                            // .mp3
];

// 1. Nastavení Multer (Limit 30MB + Filter typů)
const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
    fileFilter: (req, file, cb) => {
        // KROK 1: Kontrola MIME typu (co o sobě soubor tvrdí)
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error("UNSUPPORTED_FORMAT"));
        }
        
        // KROK 2: Dvojitá kontrola přípony (pojistka)
        // (Protože někdo může přejmenovat virus.exe na virus.jpg)
        // V reálné produkci se kontrolují "magic numbers" (obsah souboru), ale pro soutěž stačí toto.
        const allowedExtensions = /\.(pdf|docx|txt|png|jpg|jpeg|gif|mp4|mp3)$/i;
        if (!file.originalname.match(allowedExtensions)) {
            return cb(new Error("UNSUPPORTED_FORMAT"));
        }

        cb(null, true); // Prošlo kontrolou, povolujeme.
    }
});

export const materialsRouter = express.Router({ mergeParams: true });

// Helper middleware pro odchycení chyb Multeru
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// GET /courses/:courseId/materials - Seznam materiálů kurzu
materialsRouter.get("/", async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        // Získání ID kurzu
        const [courses] = await pool.execute(
            "SELECT id FROM courses WHERE uuid = ? OR id = ?",
            [courseId, courseId]
        );

        if ((courses as any).length === 0) {
            res.status(404).json({ error: "Kurz nenalezen" });
            return;
        }
        const dbCourseId = (courses as any)[0].id;

        // Načtení materiálů seřazených od nejnovějšího
        const [rows] = await pool.execute(
            `SELECT uuid, type, name, description, content, mime_type, created_at 
             FROM materials 
             WHERE course_id = ? 
             ORDER BY created_at DESC`,
            [dbCourseId]
        );

        // Mapování pro frontend
        const materials = (rows as any).map((m: any) => ({
            uuid: m.uuid,
            type: m.type,
            name: m.name,
            description: m.description,
            mimeType: m.mime_type,
            url: m.type === 'url' ? m.content : undefined,
            fileUrl: m.type === 'file' ? `/uploads/${m.content}` : undefined
        }));

        res.json(materials);
    } catch (error) {
        console.error("Chyba GET materials:", error);
        res.status(500).json({ error: "Chyba při načítání" });
    }
});

// POST /courses/:courseId/materials - Přidání materiálu
materialsRouter.post("/", handleUpload, async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const { type, name, description, url } = req.body;
        const file = req.file;

        // Validace
        if (!type || !name) {
             res.status(400).json({ error: "Chybí povinná pole" });
             return;
        }

        // Získání ID kurzu
        const [courses] = await pool.execute(
            "SELECT id FROM courses WHERE uuid = ? OR id = ?",
            [courseId, courseId]
        );

        if ((courses as any).length === 0) {
             res.status(404).json({ error: "Kurz nenalezen" });
             return;
        }
        const dbCourseId = (courses as any)[0].id;

        // Příprava dat
        const newUuid = uuidv4();
        let content = "";
        let mimeType = null;

        if (type === "url") {
            content = url;
        } else if (type === "file") {
            if (!file) {
                 res.status(400).json({ error: "Chybí soubor" });
                 return;
            }
            content = file.filename;
            mimeType = file.mimetype;
        }

        // Zápis do DB
        await pool.execute(
            `INSERT INTO materials (uuid, course_id, type, name, description, content, mime_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newUuid, dbCourseId, type, name, description, content, mimeType]
        );

        // --- PŘIDÁNO: AUTOMATICKÁ UDÁLOST DO FEEDU (FÁZE 4) ---
        try {
            const feedUuid = uuidv4();
            const feedContent = `Nový studijní materiál: ${name}`;

            // 1. Zápis do DB feedu
            await pool.execute(
                "INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                [feedUuid, dbCourseId, "system", feedContent, null]
            );

            // 2. Odeslání přes SSE
            broadcastToCourse(courseId, {
                uuid: feedUuid,
                type: "system",
                content: feedContent,
                createdAt: new Date(),
                isEdited: false
            });
        } catch (feedError) {
            console.error("Nepodařilo se zapsat do feedu:", feedError);
            // Nechceme shodit request, pokud selže jen feed
        }
        // --------------------------------------------------------

        res.status(201).json({
            uuid: newUuid,
            type,
            name,
            description,
            mimeType,
            url: type === 'url' ? content : undefined,
            fileUrl: type === 'file' ? `/uploads/${content}` : undefined
        });

    } catch (error) {
        console.error("Chyba POST materials:", error);
        res.status(500).json({ error: "Chyba při ukládání" });
    }
});

// PUT /courses/:courseId/materials/:materialId - Úprava materiálu
materialsRouter.put("/:materialId", handleUpload, async (req: Request, res: Response) => {
    try {
        const { materialId } = req.params;
        const { name, description, url } = req.body;
        const file = req.file;

        // 1. Ověření existence materiálu
        const [materials] = await pool.execute(
            "SELECT * FROM materials WHERE uuid = ?",
            [materialId]
        );

        if ((materials as any).length === 0) {
             res.status(404).json({ error: "Materiál nenalezen" });
             return;
        }
        const currentMaterial = (materials as any)[0];

        // 2. Příprava změn
        let newContent = currentMaterial.content;
        let newMimeType = currentMaterial.mime_type;

        // Pokud nahráváme nový soubor, přepíšeme obsah
        if (file) {
            newContent = file.filename;
            newMimeType = file.mimetype;
        } 
        // Pokud měníme URL u typu 'url'
        else if (currentMaterial.type === 'url' && url) {
            newContent = url;
        }

        // 3. Update v DB
        await pool.execute(
            `UPDATE materials 
             SET name = ?, description = ?, content = ?, mime_type = ?
             WHERE uuid = ?`,
            [name || currentMaterial.name, description || currentMaterial.description, newContent, newMimeType, materialId]
        );

        // 4. Vrácení aktualizovaných dat
        res.json({
            uuid: materialId,
            type: currentMaterial.type,
            name: name || currentMaterial.name,
            description: description || currentMaterial.description,
            mimeType: newMimeType,
            url: currentMaterial.type === 'url' ? newContent : undefined,
            fileUrl: currentMaterial.type === 'file' ? `/uploads/${newContent}` : undefined
        });

    } catch (error) {
        console.error("Chyba PUT materials:", error);
        res.status(500).json({ error: "Chyba při úpravě" });
    }
});

// DELETE /courses/:courseId/materials/:materialId - Smazání materiálu
materialsRouter.delete("/:materialId", async (req: Request, res: Response) => {
    try {
        const { materialId } = req.params;

        // Smazání z DB
        const [result] = await pool.execute(
            "DELETE FROM materials WHERE uuid = ?",
            [materialId]
        );

        if ((result as any).affectedRows === 0) {
             res.status(404).json({ error: "Materiál nenalezen" });
             return;
        }

        res.status(204).send();
    } catch (error) {
        console.error("Chyba DELETE materials:", error);
        res.status(500).json({ error: "Chyba při mazání" });
    }
});