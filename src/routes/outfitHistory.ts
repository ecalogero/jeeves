import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/outfit-history — log an outfit worn to a meeting
router.post('/', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const { meetingTitle, meetingLocation, meetingFormality, wornAt, itemIds, feedback } = req.body;

  const entry = await prisma.outfitHistory.create({
    data: {
      userId: uid,
      meetingTitle,
      meetingLocation,
      meetingFormality,
      wornAt: new Date(wornAt ?? Date.now()),
      itemIds: itemIds ?? [],
      feedback: feedback ?? null,
    },
  });
  res.json(entry);
});

// GET /api/outfit-history — recent history for the user
router.get('/', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const history = await prisma.outfitHistory.findMany({
    where: { userId: uid },
    orderBy: { wornAt: 'desc' },
    take: 50,
  });
  res.json(history);
});

export default router;
