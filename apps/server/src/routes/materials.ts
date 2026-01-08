import express from "express";
import multer from "multer";
import { pool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

// 1. Nastavení pro nahrávání souborů
const upload = multer({
    dest: "uploads/", // Soubory se budou ukládat sem
    limits: { fileSize: 30 * 1024 * 1024 }, // Limit 30 MB
});

// 2. mergeParams: true je NUTNÉ, abychom viděli ID kurzu z nadřazené URL
export const materialsRouter = express.Router({ mergeParams: true });

// GET /courses/:courseId/materials - Seznam materiálů kurzu
materialsRouter.get("/", async (req, res) => {
    try {
    const { courseId } = req.params as { courseId: string }; // Získáme UUID kurzu z URL

    // Načteme materiály připojené k tomuto kurzu
    // Používáme JOIN, protože v URL máme UUID, ale v tabulce materials je ID (číslo)
    const [rows] = await pool.execute(
        `SELECT m.id, m.uuid, m.type, m.name, m.content, m.created_at 
        FROM materials m
        JOIN courses c ON m.course_id = c.id
        WHERE c.uuid = ? OR c.id = ?`,
        [courseId, courseId]
    );

    res.json(rows);
    } catch (error) {
    console.error("Chyba GET materials:", error);
    res.status(500).json({ error: "Chyba při načítání" });
    }
});

// POST /courses/:courseId/materials - Přidání materiálu (Soubor nebo Odkaz)
materialsRouter.post("/", upload.single("file"), async (req, res) => {
    try {
    const { courseId } = req.params as { courseId: string };;
    const { type, name, content } = req.body;
    const file = req.file;

    // 1. Musíme zjistit číselné ID kurzu podle UUID
    const [courses] = await pool.execute(
        "SELECT id FROM courses WHERE uuid = ? OR id = ?",
        [courseId, courseId]
    );

    if ((courses as any).length === 0) {
        res.status(404).json({ error: "Kurz nenalezen" });
        return;
    }
    const dbCourseId = (courses as any)[0].id;

    // 2. Příprava dat k uložení
    const newUuid = uuidv4();
    let finalContent = content; // Pro odkazy

    if (type === "file" && file) {
      finalContent = file.filename; // Pro soubory ukládáme název na disku
    }

    // 3. Zápis do DB
    await pool.execute(
        "INSERT INTO materials (uuid, course_id, type, name, content) VALUES (?, ?, ?, ?, ?)",
        [newUuid, dbCourseId, type, name, finalContent]
    );

    res.status(201).json({ message: "Materiál přidán", uuid: newUuid });
    } catch (error) {
    console.error("Chyba POST materials:", error);
    res.status(500).json({ error: "Chyba při ukládání" });
    }
});