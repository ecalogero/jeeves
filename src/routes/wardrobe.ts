import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Ensure user row exists (upsert on every authenticated request)
async function ensureUser(req: AuthRequest) {
  await prisma.user.upsert({
    where: { firebaseUid: req.uid },
    update: { email: req.userEmail, displayName: req.userDisplayName, photoUrl: req.userPhotoUrl },
    create: { firebaseUid: req.uid, email: req.userEmail, displayName: req.userDisplayName, photoUrl: req.userPhotoUrl },
  });
}

// GET /api/wardrobe
router.get('/', async (req, res: Response) => {
  const authReq = req as AuthRequest;
  await ensureUser(authReq);
  const items = await prisma.wardrobeItem.findMany({
    where: { userId: authReq.uid },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

// POST /api/wardrobe — create one item
router.post('/', async (req, res: Response) => {
  const authReq = req as AuthRequest;
  await ensureUser(authReq);
  const { id: _id, createdAt: _c, updatedAt: _u, userId: _uid, ...data } = req.body;
  const item = await prisma.wardrobeItem.create({
    data: { ...data, userId: authReq.uid },
  });
  res.json(item);
});

// POST /api/wardrobe/bulk — migrate localStorage items in one shot
router.post('/bulk', async (req, res: Response) => {
  const authReq = req as AuthRequest;
  await ensureUser(authReq);
  const items: any[] = req.body.items ?? [];
  const created = await Promise.all(
    items.map(({ id: _id, createdAt: _c, updatedAt: _u, userId: _uid, ...data }: any) =>
      prisma.wardrobeItem.create({ data: { ...data, userId: authReq.uid } })
    )
  );
  res.json(created);
});

// PUT /api/wardrobe/:id — update one item
router.put('/:id', async (req, res: Response) => {
  const authReq = req as unknown as AuthRequest;
  const existing = await prisma.wardrobeItem.findFirst({
    where: { id: req.params.id, userId: authReq.uid },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { id: _id, createdAt: _c, updatedAt: _u, userId: _uid, ...data } = req.body;
  const item = await prisma.wardrobeItem.update({
    where: { id: req.params.id },
    data,
  });
  res.json(item);
});

// DELETE /api/wardrobe/:id
router.delete('/:id', async (req, res: Response) => {
  const authReq = req as unknown as AuthRequest;
  const existing = await prisma.wardrobeItem.findFirst({
    where: { id: req.params.id, userId: authReq.uid },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.wardrobeItem.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
