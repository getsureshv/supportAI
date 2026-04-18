import { Request, Response, NextFunction } from 'express';
import { authService, SessionUser } from '../services/AuthService.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const COOKIE_NAME = 'dcl_session';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  const cookie = (req as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const { sub } = authService.verifyJwt(token);
    const user = await authService.getUserById(sub);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
