import { Router } from 'express';
import type { Request, Response } from 'express'; // Oddělený import pro typy
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export const feedRouter = Router({ mergeParams: true });

// Paměť pro aktivní připojení (SSE)
// Klíč = courseId, Hodnota = pole otevřených odpovědí (res)
const clients: Record<string, Response[]> = {};

// Helper: Poslat událost všem připojeným v daném kurzu
export const broadcastToCourse = (courseId: string, event: any) => {
  const courseClients = clients[courseId] || [];
  courseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
};

// --- 1. SSE Endpoint (Zde se frontend "napíchne") ---
feedRouter.get('/stream', (req: Request, res: Response) => {
  const { courseId } = req.params;

  // Hlavičky pro SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Přidat klienta do seznamu
  if (!clients[courseId]) {
    clients[courseId] = [];
  }
  clients[courseId].push(res);

  // Když klient zavře okno, vyhodíme ho ze seznamu
  req.on('close', () => {
    clients[courseId] = clients[courseId].filter(c => c !== res);
  });
});

// --- 2. Načtení historie (při načtení stránky) ---
feedRouter.get('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM feed_events WHERE course_id = (SELECT id FROM courses WHERE uuid = ?) ORDER BY created_at DESC',
      [courseId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// --- 3. Přidání zprávy (Lektor) ---
feedRouter.post('/', async (req: Request, res: Response) => {
  const { courseId } = req.params; // Zde je to UUID kurzu
  const { content, author, type } = req.body;

  try {
    const newUuid = uuidv4();
    
    // Získat ID kurzu (INT) z UUID
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) {
        res.status(404).send('Course not found');
        return;
    }
    const courseIntId = courseRows[0].id;

    // Uložit do DB
    await pool.execute(
      'INSERT INTO feed_events (uuid, course_id, type, content, author) VALUES (?, ?, ?, ?, ?)',
      [newUuid, courseIntId, type || 'message', content, author]
    );

    const newEvent = {
      uuid: newUuid,
      type: type || 'message',
      content,
      author,
      created_at: new Date()
    };

    // Poslat všem připojeným (Real-time!)
    broadcastToCourse(courseId, newEvent);

    res.json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});