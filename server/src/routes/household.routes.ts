import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, validate, requireAdmin, requireAdult } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';

const router = Router();

router.use(authMiddleware);

const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional()
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADULT', 'KID'])
});

/**
 * GET /api/household
 * Get household with members
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const household = await prisma.household.findUnique({
      where: { id: req.user!.householdId }
    });

    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    const members = await prisma.user.findMany({
      where: { householdId: req.user!.householdId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        famCoins: true,
        avatarState: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    // Get latest mood for each member
    const recentMoods = await prisma.moodLog.findMany({
      where: {
        householdId: req.user!.householdId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId']
    });

    const membersWithMood = members.map(member => {
      const mood = recentMoods.find(m => m.userId === member.id);
      return {
        ...member,
        currentMood: mood?.mood || null,
        lastMoodUpdate: mood?.createdAt || null
      };
    });

    res.json({
      household: {
        id: household.id,
        name: household.name,
        inviteCode: household.inviteCode,
        timezone: household.timezone
      },
      members: membersWithMood
    });
  } catch (error) {
    console.error('[Household] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch household' });
  }
});

/**
 * PATCH /api/household
 * Update household settings (admin only)
 */
router.patch('/', requireAdmin, validate(updateHouseholdSchema), async (req: Request, res: Response) => {
  try {
    const household = await prisma.household.update({
      where: { id: req.user!.householdId },
      data: req.body
    });

    res.json(household);
  } catch (error) {
    console.error('[Household] Update error:', error);
    res.status(500).json({ message: 'Failed to update household' });
  }
});

/**
 * POST /api/household/regenerate-invite
 * Generate new invite code (admin only)
 */
router.post('/regenerate-invite', requireAdmin, async (req: Request, res: Response) => {
  try {
    const household = await prisma.household.update({
      where: { id: req.user!.householdId },
      data: {
        inviteCode: crypto.randomUUID().slice(0, 8).toUpperCase()
      }
    });

    res.json({ inviteCode: household.inviteCode });
  } catch (error) {
    console.error('[Household] Regenerate invite error:', error);
    res.status(500).json({ message: 'Failed to regenerate invite code' });
  }
});

/**
 * POST /api/household/invite
 * Send invite to join household (adults only)
 */
router.post('/invite', requireAdult, validate(inviteMemberSchema), async (req: Request, res: Response) => {
  try {
    const household = await prisma.household.findUnique({
      where: { id: req.user!.householdId }
    });

    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    // In production, send email with invite link
    // For now, return invite code
    res.json({
      inviteCode: household.inviteCode,
      inviteUrl: `${process.env.FRONTEND_URL}/join/${household.inviteCode}`
    });
  } catch (error) {
    console.error('[Household] Invite error:', error);
    res.status(500).json({ message: 'Failed to send invite' });
  }
});

/**
 * POST /api/household/join/:inviteCode
 * Join household via invite code
 */
router.post('/join/:inviteCode', async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.params;
    const { role } = req.body;

    if (!['ADULT', 'KID'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode }
    });

    if (!household) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Update user's household
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        householdId: household.id,
        role: role as 'ADULT' | 'KID'
      },
      include: { household: true }
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      household: {
        id: household.id,
        name: household.name
      }
    });
  } catch (error) {
    console.error('[Household] Join error:', error);
    res.status(500).json({ message: 'Failed to join household' });
  }
});

/**
 * DELETE /api/household/members/:userId
 * Remove member from household (admin only)
 */
router.delete('/members/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Can't remove yourself
    if (userId === req.user!.id) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }

    // Verify user belongs to household
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        householdId: req.user!.householdId
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Delete user (cascades to related data)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('[Household] Remove member error:', error);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

/**
 * PATCH /api/household/members/:userId/role
 * Update member role (admin only)
 */
router.patch('/members/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['ADULT', 'KID'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Can't change own role
    if (userId === req.user!.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json({
      id: user.id,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    console.error('[Household] Update role error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

export default router;
