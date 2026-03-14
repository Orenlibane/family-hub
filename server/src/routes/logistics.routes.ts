import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, validate, requireAdult } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { getString } from '../utils/helpers.js';
import { emitToHousehold } from '../services/socket.service.js';

const router = Router();

router.use(authMiddleware);

// ==================== SCHEMAS ====================

const createLogisticsSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(['PICKUP', 'ACTIVITY', 'SHOPPING', 'CHORE']),
  dayOfWeek: z.number().min(0).max(6),
  timeSlot: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
  assignedToId: z.string().optional()
});

const updateLogisticsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(['PICKUP', 'ACTIVITY', 'SHOPPING', 'CHORE']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  timeSlot: z.string().max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  assignedToId: z.string().nullable().optional()
});

const bulkSaveSchema = z.object({
  items: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    category: z.enum(['PICKUP', 'ACTIVITY', 'SHOPPING', 'CHORE']),
    dayOfWeek: z.number().min(0).max(6),
    timeSlot: z.string().max(10).optional(),
    notes: z.string().max(500).optional(),
    assignedToId: z.string().nullable().optional()
  })),
  deleteIds: z.array(z.string()).optional()
});

// ==================== HELPER FUNCTIONS ====================

function formatLogisticsItem(item: any) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    dayOfWeek: item.dayOfWeek,
    timeSlot: item.timeSlot,
    notes: item.notes,
    createdAt: item.createdAt,
    assignedTo: item.assignedTo ? {
      id: item.assignedTo.id,
      name: item.assignedTo.name,
      avatarUrl: item.assignedTo.avatarUrl
    } : null,
    createdBy: {
      id: item.createdBy.id,
      name: item.createdBy.name
    }
  };
}

// ==================== ROUTES ====================

/**
 * GET /api/logistics
 * Get all logistics items for household
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const householdId = req.user!.householdId;

    const items = await prisma.logisticsItem.findMany({
      where: { householdId },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlot: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(items.map(formatLogisticsItem));
  } catch (error) {
    console.error('[Logistics] Get all error:', error);
    res.status(500).json({ message: 'Failed to fetch logistics items' });
  }
});

/**
 * GET /api/logistics/day/:dayOfWeek
 * Get logistics items for a specific day
 */
router.get('/day/:dayOfWeek', async (req: Request, res: Response) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'Invalid day of week' });
    }

    const items = await prisma.logisticsItem.findMany({
      where: {
        householdId: req.user!.householdId,
        dayOfWeek
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { timeSlot: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(items.map(formatLogisticsItem));
  } catch (error) {
    console.error('[Logistics] Get by day error:', error);
    res.status(500).json({ message: 'Failed to fetch logistics items' });
  }
});

/**
 * POST /api/logistics
 * Create logistics item (adults only)
 */
router.post('/', requireAdult, validate(createLogisticsSchema), async (req: Request, res: Response) => {
  try {
    const { title, category, dayOfWeek, timeSlot, notes, assignedToId } = req.body;
    const householdId = req.user!.householdId;

    // Verify assignee belongs to household if provided
    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, householdId }
      });
      if (!assignee) {
        return res.status(400).json({ message: 'Invalid assignee' });
      }
    }

    const item = await prisma.logisticsItem.create({
      data: {
        title,
        category,
        dayOfWeek,
        timeSlot,
        notes,
        householdId,
        createdById: req.user!.id,
        assignedToId
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    const formattedItem = formatLogisticsItem(item);

    // Emit to household
    emitToHousehold(householdId, 'logistics:created', formattedItem);

    res.status(201).json(formattedItem);
  } catch (error) {
    console.error('[Logistics] Create error:', error);
    res.status(500).json({ message: 'Failed to create logistics item' });
  }
});

/**
 * PATCH /api/logistics/:id
 * Update logistics item (adults only)
 */
router.patch('/:id', requireAdult, validate(updateLogisticsSchema), async (req: Request, res: Response) => {
  try {
    const itemId = getString(req.params.id);
    if (!itemId) return res.status(400).json({ message: 'Item ID required' });

    const householdId = req.user!.householdId;

    const existingItem = await prisma.logisticsItem.findFirst({
      where: { id: itemId, householdId }
    });

    if (!existingItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Verify assignee if changing
    if (req.body.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: req.body.assignedToId, householdId }
      });
      if (!assignee) {
        return res.status(400).json({ message: 'Invalid assignee' });
      }
    }

    const item = await prisma.logisticsItem.update({
      where: { id: itemId },
      data: req.body,
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    const formattedItem = formatLogisticsItem(item);

    // Emit to household
    emitToHousehold(householdId, 'logistics:updated', formattedItem);

    res.json(formattedItem);
  } catch (error) {
    console.error('[Logistics] Update error:', error);
    res.status(500).json({ message: 'Failed to update logistics item' });
  }
});

/**
 * PATCH /api/logistics/:id/assign
 * Assign logistics item to member (adults only)
 */
router.patch('/:id/assign', requireAdult, async (req: Request, res: Response) => {
  try {
    const itemId = getString(req.params.id);
    if (!itemId) return res.status(400).json({ message: 'Item ID required' });

    const { assignedToId } = req.body;
    const householdId = req.user!.householdId;

    const existingItem = await prisma.logisticsItem.findFirst({
      where: { id: itemId, householdId }
    });

    if (!existingItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Verify assignee if provided
    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, householdId }
      });
      if (!assignee) {
        return res.status(400).json({ message: 'Invalid assignee' });
      }
    }

    const item = await prisma.logisticsItem.update({
      where: { id: itemId },
      data: { assignedToId: assignedToId || null },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });

    const formattedItem = formatLogisticsItem(item);

    // Emit to household
    emitToHousehold(householdId, 'logistics:updated', formattedItem);

    res.json(formattedItem);
  } catch (error) {
    console.error('[Logistics] Assign error:', error);
    res.status(500).json({ message: 'Failed to assign logistics item' });
  }
});

/**
 * DELETE /api/logistics/:id
 * Delete logistics item (adults only)
 */
router.delete('/:id', requireAdult, async (req: Request, res: Response) => {
  try {
    const itemId = getString(req.params.id);
    if (!itemId) return res.status(400).json({ message: 'Item ID required' });

    const item = await prisma.logisticsItem.findFirst({
      where: {
        id: itemId,
        householdId: req.user!.householdId
      }
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await prisma.logisticsItem.delete({
      where: { id: itemId }
    });

    // Emit to household
    emitToHousehold(req.user!.householdId, 'logistics:deleted', { id: itemId });

    res.status(204).send();
  } catch (error) {
    console.error('[Logistics] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete logistics item' });
  }
});

/**
 * POST /api/logistics/bulk
 * Bulk save logistics items (create/update/delete) - adults only
 */
router.post('/bulk', requireAdult, validate(bulkSaveSchema), async (req: Request, res: Response) => {
  try {
    const { items, deleteIds } = req.body;
    const householdId = req.user!.householdId;
    const createdById = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      // Delete specified items
      if (deleteIds && deleteIds.length > 0) {
        await tx.logisticsItem.deleteMany({
          where: {
            id: { in: deleteIds },
            householdId
          }
        });
      }

      // Process items (create or update)
      const processed = [];
      for (const item of items) {
        if (item.id) {
          // Update existing
          const updated = await tx.logisticsItem.update({
            where: { id: item.id },
            data: {
              title: item.title,
              category: item.category,
              dayOfWeek: item.dayOfWeek,
              timeSlot: item.timeSlot,
              notes: item.notes,
              assignedToId: item.assignedToId
            },
            include: {
              assignedTo: {
                select: { id: true, name: true, avatarUrl: true }
              },
              createdBy: {
                select: { id: true, name: true }
              }
            }
          });
          processed.push(updated);
        } else {
          // Create new
          const created = await tx.logisticsItem.create({
            data: {
              title: item.title,
              category: item.category,
              dayOfWeek: item.dayOfWeek,
              timeSlot: item.timeSlot,
              notes: item.notes,
              householdId,
              createdById,
              assignedToId: item.assignedToId
            },
            include: {
              assignedTo: {
                select: { id: true, name: true, avatarUrl: true }
              },
              createdBy: {
                select: { id: true, name: true }
              }
            }
          });
          processed.push(created);
        }
      }

      return processed;
    });

    const formattedItems = result.map(formatLogisticsItem);

    // Emit to household
    emitToHousehold(householdId, 'logistics:synced', { items: formattedItems });

    res.json(formattedItems);
  } catch (error) {
    console.error('[Logistics] Bulk save error:', error);
    res.status(500).json({ message: 'Failed to save logistics items' });
  }
});

export default router;
