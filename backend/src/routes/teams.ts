import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: [{ division: 'asc' }, { name: 'asc' }],
    });
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
