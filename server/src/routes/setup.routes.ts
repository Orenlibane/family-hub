import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/setup/make-admin
 * One-time setup to make a user admin
 * Only works if user's email is orenlibane@gmail.com
 */
router.post('/make-admin', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow specific email to self-promote to admin
    if (user.email !== 'orenlibane@gmail.com') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update to ADMIN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    res.json({
      message: 'Successfully promoted to ADMIN',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('[Setup] Make admin error:', error);
    res.status(500).json({ message: 'Failed to make admin' });
  }
});

export default router;
