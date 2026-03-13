import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TaskStatus, TaskCategory } from '@prisma/client';
import { authMiddleware, validate, requireAdult } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { emitToHousehold } from '../services/socket.service.js';
import { getString } from '../utils/helpers.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['CHORE', 'HOMEWORK', 'ERRAND', 'HEALTH', 'SOCIAL', 'OTHER']).default('CHORE'),
  coinReward: z.number().int().min(0).max(1000).default(10),
  isMustDo: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().optional(),
  recurrence: z.object({
    type: z.enum(['daily', 'weekly', 'monthly']),
    days: z.array(z.number()).optional(),
    endDate: z.string().datetime().optional()
  }).optional()
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

/**
 * GET /api/tasks
 * List all tasks for household
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = getString(req.query.status) as TaskStatus | undefined;
    const assignedToId = getString(req.query.assignedToId);
    const category = getString(req.query.category) as TaskCategory | undefined;
    const isMustDo = req.query.isMustDo;

    const tasks = await prisma.task.findMany({
      where: {
        householdId: req.user!.householdId,
        ...(status && { status }),
        ...(assignedToId && { assignedToId }),
        ...(category && { category }),
        ...(isMustDo !== undefined && { isMustDo: isMustDo === 'true' })
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
        { isMustDo: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[Tasks] List error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/tasks/:id
 * Get single task
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Task ID required' });

    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: req.user!.householdId
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        completedBy: {
          select: { id: true, name: true }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('[Tasks] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

/**
 * POST /api/tasks
 * Create new task (adults only)
 */
router.post('/', requireAdult, validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.create({
      data: {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        householdId: req.user!.householdId,
        createdById: req.user!.id
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

    // Broadcast to household
    emitToHousehold(req.user!.householdId, 'task:created', task);

    res.status(201).json(task);
  } catch (error) {
    console.error('[Tasks] Create error:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update task
 */
router.patch('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Task ID required' });

    // Verify task exists and belongs to household
    const existing = await prisma.task.findFirst({
      where: {
        id,
        householdId: req.user!.householdId
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Kids can only update status on tasks assigned to them
    if (req.user!.role === 'KID') {
      if (existing.assignedToId !== req.user!.id) {
        return res.status(403).json({ message: 'Cannot update tasks not assigned to you' });
      }
      // Kids can only claim or mark in progress
      const allowedUpdates = ['status', 'assignedToId'];
      const updateKeys = Object.keys(req.body);
      if (!updateKeys.every(k => allowedUpdates.includes(k))) {
        return res.status(403).json({ message: 'Kids can only update task status' });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
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

    // Broadcast to household
    emitToHousehold(req.user!.householdId, 'task:updated', task);

    res.json(task);
  } catch (error) {
    console.error('[Tasks] Update error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task (adults only)
 */
router.delete('/:id', requireAdult, async (req: Request, res: Response) => {
  try {
    const id = getString(req.params.id);
    if (!id) return res.status(400).json({ message: 'Task ID required' });

    const task = await prisma.task.findFirst({
      where: {
        id,
        householdId: req.user!.householdId
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id }
    });

    // Broadcast to household
    emitToHousehold(req.user!.householdId, 'task:deleted', task);

    res.status(204).send();
  } catch (error) {
    console.error('[Tasks] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

export default router;
