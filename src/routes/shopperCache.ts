import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

export function computeGapsHash(gaps: any[]): string {
  const fingerprint = gaps
    .map((g: any) => `${g.type}:${g.suggestedCategory}:${g.severity}`)
    .sort()
    .join('|');
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
}

// GET /api/shopper/cache?gapsHash=...
router.get('/cache', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const { gapsHash } = req.query as { gapsHash: string };
  if (!gapsHash) return res.json({ cached: false });

  const entry = await prisma.shopperCache.findFirst({
    where: {
      userId: uid,
      gapsHash,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!entry) return res.json({ cached: false });
  res.json({ cached: true, recommendations: entry.recommendations });
});

// POST /api/shopper/cache — save recommendations
router.post('/cache', async (req, res: Response) => {
  const { uid } = req as AuthRequest;
  const { gapsHash, recommendations } = req.body;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL
  const entry = await prisma.shopperCache.create({
    data: { userId: uid, gapsHash, recommendations, expiresAt },
  });
  res.json(entry);
});

export default router;
