import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authMiddleware, validate, requireAdmin } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { getString } from '../utils/helpers.js';
import { emitToHousehold } from '../services/socket.service.js';

const router = Router();

router.use(authMiddleware);
router.use(requireAdmin);

// ==================== SCHEMAS ====================

const createChildSchema = z.object({
  username: z.string().min(2).max(50),
  name: z.string().min(1).max(100),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADULT', 'KID']).optional()
});

const resetPinSchema = z.object({
  newPin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
});

// ==================== ROUTES ====================

/**
 * POST /api/admin/users/child
 * Create a child account with username + PIN (no email required)
 */
router.post('/users/child', validate(createChildSchema), async (req: Request, res: Response) => {
  try {
    const { username, name, pin } = req.body;
    const householdId = req.user!.householdId;

    // Check if username already exists in household
    const existingAuth = await prisma.childAuth.findFirst({
      where: {
        username,
        user: { householdId }
      }
    });

    if (existingAuth) {
      return res.status(400).json({ message: 'Username already exists in this household' });
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Create user and child auth in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create a unique email for system purposes (not used for login)
      const systemEmail = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@family-hub.local`;

      const user = await tx.user.create({
        data: {
          email: systemEmail,
          name,
          role: 'KID',
          householdId,
          famCoins: 0
        }
      });

      const childAuth = await tx.childAuth.create({
        data: {
          username,
          pinHash,
          userId: user.id
        }
      });

      return { user, childAuth };
    });

    // Emit to household
    emitToHousehold(householdId, 'member:added', {
      id: result.user.id,
      name: result.user.name,
      role: result.user.role,
      famCoins: result.user.famCoins,
      username: result.childAuth.username
    });

    res.status(201).json({
      id: result.user.id,
      name: result.user.name,
      role: result.user.role,
      username: result.childAuth.username,
      famCoins: result.user.famCoins
    });
  } catch (error) {
    console.error('[Admin] Create child error:', error);
    res.status(500).json({ message: 'Failed to create child account' });
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details (name, role)
 */
router.patch('/users/:userId', validate(updateMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getString(req.params.userId);
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const { name, role } = req.body;
    const householdId = req.user!.householdId;

    // Can't change own role
    if (userId === req.user!.id && role) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Verify user belongs to household
    const existingUser = await prisma.user.findFirst({
      where: { id: userId, householdId }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(role && { role })
      },
      include: {
        childAuth: {
          select: { username: true }
        }
      }
    });

    // Emit to household
    emitToHousehold(householdId, 'member:updated', {
      id: updatedUser.id,
      name: updatedUser.name,
      role: updatedUser.role,
      famCoins: updatedUser.famCoins,
      username: updatedUser.childAuth?.username
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      role: updatedUser.role,
      username: updatedUser.childAuth?.username
    });
  } catch (error) {
    console.error('[Admin] Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users/:userId/reset-pin
 * Reset child PIN
 */
router.post('/users/:userId/reset-pin', validate(resetPinSchema), async (req: Request, res: Response) => {
  try {
    const userId = getString(req.params.userId);
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const { newPin } = req.body;
    const householdId = req.user!.householdId;

    // Verify user belongs to household and has child auth
    const user = await prisma.user.findFirst({
      where: { id: userId, householdId },
      include: { childAuth: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.childAuth) {
      return res.status(400).json({ message: 'User does not have PIN authentication' });
    }

    // Hash new PIN
    const pinHash = await bcrypt.hash(newPin, 10);

    // Update PIN
    await prisma.childAuth.update({
      where: { userId },
      data: { pinHash }
    });

    res.json({ message: 'PIN reset successfully' });
  } catch (error) {
    console.error('[Admin] Reset PIN error:', error);
    res.status(500).json({ message: 'Failed to reset PIN' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user details including child auth info
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = getString(req.params.userId);
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        householdId: req.user!.householdId
      },
      include: {
        childAuth: {
          select: { username: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      famCoins: user.famCoins,
      avatarUrl: user.avatarUrl,
      avatarState: user.avatarState,
      hasChildAuth: !!user.childAuth,
      username: user.childAuth?.username
    });
  } catch (error) {
    console.error('[Admin] Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

export default router;
