import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_WEIGHTS = {
  weatherWeight: 1.1,
  formalityWeight: 1.0,
  comfortWeight: 1.2,
  favoriteWeight: 1.0,
};

// GET /api/preferences
router.get('/', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const prefs = await prisma.userPreferences.findUnique({ where: { userId: uid } });
  if (!prefs) {
    // Return defaults — no row created yet
    return res.json({
      warmthLean: 'balanced',
      formalityLean: 0,
      commuteComfortPriority: true,
      rainToleranceThreshold: 30,
      favoriteColors: ['navy', 'charcoal', 'white'],
      dislikedMaterials: ['polyester'],
      feedbackCount: 0,
      weights: DEFAULT_WEIGHTS,
    });
  }
  res.json(prefs);
});

// PUT /api/preferences — upsert
router.put('/', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const {
    warmthLean,
    formalityLean,
    commuteComfortPriority,
    rainToleranceThreshold,
    favoriteColors,
    dislikedMaterials,
    feedbackCount,
    weights,
  } = req.body;

  const data = {
    warmthLean,
    formalityLean,
    commuteComfortPriority,
    rainToleranceThreshold,
    favoriteColors,
    dislikedMaterials,
    feedbackCount,
    weights: weights ?? DEFAULT_WEIGHTS,
  };

  const prefs = await prisma.userPreferences.upsert({
    where: { userId: uid },
    update: data,
    create: { userId: uid, ...data },
  });
  res.json(prefs);
});

export default router;
