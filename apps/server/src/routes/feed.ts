import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export const feedRouter = Router({ mergeParams: true });

// Paměť pro aktivní připojení (SSE)
const clients: Record<string, Response[]> = {};

// --- Helper funkce pro vysílání událostí (Exportujeme ji pro použití v materials/quizzes) ---
export const broadcastToCourse = (courseId: string, event: any) => {
  const courseClients = clients[courseId] || [];
  courseClients.forEach(client => {
    // Posíláme data ve formátu SSE
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
};

// Pomocná funkce pro formátování z DB do API formátu (camelCase)
const mapEvent = (row: any) => ({
  uuid: row.uuid,
  type: row.type,
  content: row.content,
  author: row.author,
  isEdited: !!row.is_edited, // DB: is_edited (0/1) -> API: isEdited (boolean)
  createdAt: row.created_at, // DB: created_at -> API: createdAt
});

// --- 1. SSE Endpoint (Stream) ---
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

// --- 2. Načtení historie (GET) ---
feedRouter.get('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  try {
    // Získáme ID kurzu
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).json({ error: 'Course not found' });
    
    const [rows]: any = await pool.execute(
      'SELECT * FROM feed_events WHERE course_id = ? ORDER BY created_at DESC',
      [courseRows[0].id]
    );
    
    // Namapujeme data pro frontend/testy
    res.json(rows.map(mapEvent));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// --- 3. Přidání zprávy (POST) ---
feedRouter.post('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { content, author, type } = req.body;

  try {
    const newUuid = uuidv4();
    
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).send('Course not found');
    const courseIntId = courseRows[0].id;

    await pool.execute(
      'INSERT INTO feed_events (uuid, course_id, type, content, author, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [newUuid, courseIntId, type || 'message', content, author]
    );

    // Získáme vytvořený záznam (kvůli přesnému času z DB)
    const [rows]: any = await pool.execute('SELECT * FROM feed_events WHERE uuid = ?', [newUuid]);
    const newEvent = mapEvent(rows[0]);

    broadcastToCourse(courseId, newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// --- 4. Úprava zprávy (PUT) ---
feedRouter.put('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params; // eventId je UUID příspěvku
  const { content } = req.body;

  try {
    const [result]: any = await pool.execute(
      'UPDATE feed_events SET content = ?, is_edited = TRUE WHERE uuid = ?',
      [content, eventId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });

    // Načteme upravený event pro broadcast
    const [rows]: any = await pool.execute('SELECT * FROM feed_events WHERE uuid = ?', [eventId]);
    const updatedEvent = mapEvent(rows[0]);

    broadcastToCourse(courseId, { ...updatedEvent, event: 'update' }); // Informujeme klienty o změně
    res.json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// --- 5. Smazání zprávy (DELETE) ---
feedRouter.delete('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params;

  try {
    const [result]: any = await pool.execute('DELETE FROM feed_events WHERE uuid = ?', [eventId]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });

    // Pošleme klientům info, že mají tento příspěvek smazat
    broadcastToCourse(courseId, { uuid: eventId, event: 'delete' });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});