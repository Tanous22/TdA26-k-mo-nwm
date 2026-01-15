import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export const feedRouter = Router({ mergeParams: true });

// Paměť pro aktivní připojení (SSE)
const clients: Record<string, Response[]> = {};

// --- EXPORTOVANÁ FUNKCE (Vysílačka) ---
export const broadcastToCourse = (courseId: string, event: any) => {
  const courseClients = clients[courseId] || [];
  courseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
};

// Pomocná funkce: DB formát -> API formát
const mapEvent = (row: any) => ({
  uuid: row.uuid,
  type: row.type,
  content: row.content,
  author: row.author,
  isEdited: !!row.is_edited,
  createdAt: row.created_at,
});

// 1. SSE Stream
feedRouter.get('/stream', (req: Request, res: Response) => {
  const { courseId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients[courseId]) clients[courseId] = [];
  clients[courseId].push(res);

  req.on('close', () => {
    clients[courseId] = clients[courseId].filter(c => c !== res);
  });
});

// 2. Načtení historie
feedRouter.get('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  try {
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'Course not found' });
    
    const [rows]: any = await pool.execute(
      'SELECT * FROM feed_events WHERE course_id = ? ORDER BY created_at DESC',
      [courseRows[0].id]
    );
    
    res.json(rows.map(mapEvent));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// 3. Manuální příspěvek (Lektor) - ZDE BYLA CHYBA
feedRouter.post('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  // Testy posílají 'message', frontend může posílat 'content'. Musíme to sjednotit.
  const { content, message, author, type } = req.body;
  
  // Ošetření undefined hodnot (MySQL nesnáší undefined, chce null)
  const finalContent = content || message || ""; // Fallback
  const finalAuthor = author || null;            // Fallback na null

  try {
    const newUuid = uuidv4();
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).send('Course not found');
    
    const courseIntId = courseRows[0].id;

    await pool.execute(
      'INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [newUuid, courseIntId, type || 'message', finalContent, finalAuthor]
    );

    // Načteme zpět
    const [rows]: any = await pool.execute('SELECT * FROM feed_events WHERE uuid = ?', [newUuid]);
    const newEvent = mapEvent(rows[0]);

    broadcastToCourse(courseId, newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Feed Error:", error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// 4. Úprava příspěvku (PUT)
feedRouter.put('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params;
  const { content, message } = req.body;
  
  const finalContent = content || message; // Zase podpora obou variant

  try {
    const [result]: any = await pool.execute(
      'UPDATE feed_events SET content = ?, is_edited = TRUE WHERE uuid = ?',
      [finalContent, eventId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });

    const [rows]: any = await pool.execute('SELECT * FROM feed_events WHERE uuid = ?', [eventId]);
    const updatedEvent = mapEvent(rows[0]);

    broadcastToCourse(courseId, updatedEvent); 
    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// 5. Smazání příspěvku (DELETE)
feedRouter.delete('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params;

  try {
    const [result]: any = await pool.execute('DELETE FROM feed_events WHERE uuid = ?', [eventId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });

    broadcastToCourse(courseId, { uuid: eventId, type: 'delete' });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});