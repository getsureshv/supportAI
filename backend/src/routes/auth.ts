import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/requireAuth.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    const profile = await authService.verifyGoogleIdToken(idToken);
    const user = await authService.upsertFromGoogle(profile);
    const token = authService.issueJwt(user);

    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.json({ user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// Demo login — only available when GOOGLE_CLIENT_ID is NOT configured.
// Lets you test the app end-to-end without Google Cloud setup.
router.post('/demo', async (req: Request, res: Response) => {
  try {
    if (process.env.GOOGLE_CLIENT_ID) {
      return res.status(403).json({
        error: 'Demo login is disabled because GOOGLE_CLIENT_ID is configured',
      });
    }
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });

    const user = await authService.demoLogin(email, name);
    const token = authService.issueJwt(user);

    res.cookie(SESSION_COOKIE, token, cookieOptions);
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: 0 });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { team, role, name } = req.body;
    const updated = await authService.updateProfile(req.user!.id, { team, role, name });
    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public config endpoint so the frontend knows whether Google is configured
// and can show/hide the Google button vs. demo login.
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    demoLoginAvailable: !process.env.GOOGLE_CLIENT_ID,
  });
});

export default router;
