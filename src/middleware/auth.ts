import { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
if (!getApps().length) {
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

export interface AuthRequest extends Request {
  uid: string;
  userEmail: string;
  userDisplayName?: string;
  userPhotoUrl?: string;
}

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as AuthRequest).uid = decoded.uid;
    (req as AuthRequest).userEmail = decoded.email ?? '';
    (req as AuthRequest).userDisplayName = decoded.name;
    (req as AuthRequest).userPhotoUrl = decoded.picture;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
