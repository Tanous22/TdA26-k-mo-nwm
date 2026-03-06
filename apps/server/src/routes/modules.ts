import { Router } from "express";
import { pool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

export const modulesRouter = Router();

// Získání modulů kurzu
modulesRouter.get("/course/:courseId", async (req, res) => {
  try {
    const [courses] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [req.params.courseId]);
    if ((courses as any).length === 0) return res.status(404).json({ error: "Kurz nenalezen" });
    
    const [modules] = await pool.execute(
      "SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC",
      [(courses as any)[0].id]
    );
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: "Chyba při načítání modulů" });
  }
});

// Vytvoření modulu
modulesRouter.post("/", async (req, res) => {
  const { course_id, title, description, content, order_index } = req.body;
  const uuid = uuidv4();
  
  try {
    const [courses] = await pool.execute("SELECT id FROM courses WHERE uuid = ?", [course_id]);
    if ((courses as any).length === 0) return res.status(404).json({ error: "Kurz nenalezen" });
    
    await pool.execute(
      "INSERT INTO modules (uuid, course_id, title, description, content, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuid, (courses as any)[0].id, title, description || null, content || null, order_index || 0, false]
    );
    res.status(201).json({ message: "Modul vytvořen", uuid });
  } catch (error) {
    res.status(500).json({ error: "Chyba při vytváření modulu" });
  }
});

// Úprava modulu
modulesRouter.put("/:moduleId", async (req, res) => {
  const { moduleId } = req.params;
  const { title, description, content, is_published, order_index } = req.body;
  
  try {
    const [result] = await pool.execute(
      `UPDATE modules 
       SET title = COALESCE(?, title), 
           description = COALESCE(?, description), 
           content = COALESCE(?, content),
           is_published = COALESCE(?, is_published), 
           order_index = COALESCE(?, order_index)
       WHERE uuid = ?`,
      [
        title !== undefined ? title : null, 
        description !== undefined ? description : null, 
        content !== undefined ? content : null,
        is_published !== undefined ? (is_published ? 1 : 0) : null, 
        order_index !== undefined ? order_index : null, 
        moduleId
      ]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Modul nenalezen" });
    }

    res.json({ message: "Modul upraven", uuid: moduleId });
  } catch (error) {
    console.error("Chyba při úpravě modulu:", error);
    res.status(500).json({ error: "Chyba při úpravě modulu" });
  }
});