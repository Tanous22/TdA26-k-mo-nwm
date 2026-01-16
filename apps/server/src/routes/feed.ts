import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
export const feedRouter = Router({ mergeParams: true });
const clients: Record<string, Response[]> = {};
export const broadcastToCourse = (courseId: string, event: any) => {
  const courseClients = clients[courseId] || [];
  courseClients.forEach(client => {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
};
const mapEvent = (row: any) => ({
  uuid: row.uuid,
  type: row.type === 'message' ? 'manual' : row.type, 
  message: row.content, 
  author: row.author,
  edited: !!row.is_edited, 
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
feedRouter.get('/stream', (req: Request, res: Response) => {
  const { courseId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(':ok\n\n');
  if (!clients[courseId]) clients[courseId] = [];
  clients[courseId].push(res);
  req.on('close', () => {
    clients[courseId] = clients[courseId].filter(c => c !== res);
  });
});
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
feedRouter.post('/', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { content, message, author } = req.body;
  const finalContent = content || message || "";
  try {
    const newUuid = uuidv4();
    const [courseRows]: any = await pool.execute('SELECT id FROM courses WHERE uuid = ?', [courseId]);
    if (courseRows.length === 0) return res.status(404).send('Course not found');
    const courseIntId = courseRows[0].id;
    await pool.execute(
      'INSERT INTO feed_events (uuid, course_id, type, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [newUuid, courseIntId, 'message', finalContent, author || null]
    );
    const [rows]: any = await pool.execute('SELECT * FROM feed_events WHERE uuid = ?', [newUuid]);
    const newEvent = mapEvent(rows[0]);
    broadcastToCourse(courseId, newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});
feedRouter.put('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params;
  const { content, message } = req.body;
  const finalContent = content || message;
  try {
    const [result]: any = await pool.execute(
      'UPDATE feed_events SET content = ?, is_edited = TRUE, updated_at = NOW() WHERE uuid = ?',
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
feedRouter.delete('/:eventId', async (req: Request, res: Response) => {
  const { courseId, eventId } = req.params;
  try {
    const [result]: any = await pool.execute('DELETE FROM feed_events WHERE uuid = ?', [eventId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });
    broadcastToCourse(courseId, { uuid: eventId, type: 'delete' });
    res.status(204).send(); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});
