import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RedemptionStatus } from '@prisma/client';
import { authMiddleware, validate, requireAdult } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { emitToHousehold } from '../services/socket.service.js';
import { getString } from '../utils/helpers.js';

const router = Router();

router.use(authMiddleware);

const createRewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coinCost: z.number().int().min(1).max(10000),
  iconUrl: z.string().url().optional(),
  stock: z.number().int().min(0).optional()
});

const updateRewardSchema = createRewardSchema.partial().extend({
  isActive: z.boolean().optional()
});

/**
 * GET /api/rewards
 * List all rewards for household
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const isActive = req.query.isActive;

    const rewards = await prisma.reward.findMany({
      where: {
        householdId: req.user!.householdId,
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      },
      orderBy: { coinCost: 'asc' }
    });

    res.json(rewards);
  } catch (error) {
    console.error('[Rewards] List error:', error);
    res.status(500).json({ message: 'Failed to fetch rewards' });
  }
});

/**
 * POST /api/rewards
 * Create new reward (adults only)
 */
router.post('/', requireAdult, validate(createRewardSchema), async (req: Request, res: Response) => {
  try {
    const reward = await prisma.reward.create({
      data: {
        ...req.body,
        householdId: req.user!.householdId,
        createdById: req.user!.id
      }
    });

    res.status(201).json(reward);
  } catch (error) {
    console.error('[Rewards] Create error:', error);
    res.status(500).json({ message: 'Failed to create reward' });
  }
});

/**
 * PATCH /api/rewards/:id
 * Update reward (adults only)
 */
router.patch('/:id', requireAdult, validate(updateRewardSchema), async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Reward ID required' });

    const existing = await prisma.reward.findFirst({
      where: {
        id,
        householdId: req.user!.householdId
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: req.body
    });

    res.json(reward);
  } catch (error) {
    console.error('[Rewards] Update error:', error);
    res.status(500).json({ message: 'Failed to update reward' });
  }
});

/**
 * DELETE /api/rewards/:id
 * Delete reward (adults only)
 */
router.delete('/:id', requireAdult, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Reward ID required' });

    const existing = await prisma.reward.findFirst({
      where: {
        id,
        householdId: req.user!.householdId
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    await prisma.reward.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('[Rewards] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete reward' });
  }
});

/**
 * POST /api/rewards/:id/redeem
 * Redeem a reward (spends coins)
 */
router.post('/:id/redeem', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Reward ID required' });

    const reward = await prisma.reward.findFirst({
      where: {
        id,
        householdId: req.user!.householdId,
        isActive: true
      }
    });

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Check stock
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(400).json({ message: 'Reward out of stock' });
    }

    // Check user has enough coins
    if (req.user!.famCoins < reward.coinCost) {
      return res.status(400).json({ message: 'Insufficient coins' });
    }

    // Create redemption and deduct coins atomically
    const [redemption, user] = await prisma.$transaction([
      prisma.redemption.create({
        data: {
          userId: req.user!.id,
          rewardId: reward.id,
          coinsSpent: reward.coinCost
        },
        include: {
          reward: true
        }
      }),
      prisma.user.update({
        where: { id: req.user!.id },
        data: {
          famCoins: { decrement: reward.coinCost }
        }
      }),
      // Update stock if applicable
      ...(reward.stock !== null ? [
        prisma.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } }
        })
      ] : [])
    ]);

    // Notify about coin change
    emitToHousehold(req.user!.householdId, 'coins:changed', {
      userId: req.user!.id,
      amount: -reward.coinCost,
      newBalance: user.famCoins,
      reason: `Redeemed: ${reward.name}`
    });

    res.status(201).json(redemption);
  } catch (error) {
    console.error('[Rewards] Redeem error:', error);
    res.status(500).json({ message: 'Failed to redeem reward' });
  }
});

/**
 * GET /api/rewards/redemptions
 * List redemptions
 */
router.get('/redemptions', async (req: Request, res: Response) => {
  try {
    const userId = getString(req.query.userId);
    const status = getString(req.query.status) as RedemptionStatus | undefined;

    // Adults can see all, kids only their own
    const filter: { userId?: string; status?: RedemptionStatus } = {};

    if (req.user!.role === 'KID') {
      filter.userId = req.user!.id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (status) {
      filter.status = status;
    }

    const redemptions = await prisma.redemption.findMany({
      where: {
        ...filter,
        reward: {
          householdId: req.user!.householdId
        }
      },
      include: {
        reward: {
          select: { id: true, name: true, iconUrl: true }
        },
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error) {
    console.error('[Rewards] List redemptions error:', error);
    res.status(500).json({ message: 'Failed to fetch redemptions' });
  }
});

/**
 * PATCH /api/rewards/redemptions/:id
 * Update redemption status (adults only)
 */
router.patch('/redemptions/:id', requireAdult, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Redemption ID required' });

    const status = req.body.status as RedemptionStatus;
    const { rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED', 'FULFILLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existing = await prisma.redemption.findFirst({
      where: { id },
      include: {
        reward: true,
        user: true
      }
    });

    if (!existing || existing.reward.householdId !== req.user!.householdId) {
      return res.status(404).json({ message: 'Redemption not found' });
    }

    // If rejecting, refund coins
    if (status === 'REJECTED' && existing.status === 'PENDING') {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { famCoins: { increment: existing.coinsSpent } }
      });

      emitToHousehold(req.user!.householdId, 'coins:changed', {
        userId: existing.userId,
        amount: existing.coinsSpent,
        newBalance: existing.user.famCoins + existing.coinsSpent,
        reason: `Refund: ${existing.reward.name}`
      });
    }

    const redemption = await prisma.redemption.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        fulfilledAt: status === 'FULFILLED' ? new Date() : null
      },
      include: {
        reward: true,
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(redemption);
  } catch (error) {
    console.error('[Rewards] Update redemption error:', error);
    res.status(500).json({ message: 'Failed to update redemption' });
  }
});

export default router;
