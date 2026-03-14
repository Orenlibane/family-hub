import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, validate, requireAdult } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { getString } from '../utils/helpers.js';
import { emitToHousehold } from '../services/socket.service.js';

const router = Router();

router.use(authMiddleware);

// ==================== SCHEMAS ====================

const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  category: z.enum(['MOVIE_NIGHT', 'FOOD_CHOICE', 'ACTIVITY', 'FAMILY_OUTING', 'OTHER']).optional(),
  options: z.array(z.object({
    text: z.string().min(1).max(100),
    emoji: z.string().max(10).optional()
  })).min(2).max(10),
  closesAt: z.string().datetime().optional()
});

const voteSchema = z.object({
  optionId: z.string().min(1)
});

// ==================== HELPER FUNCTIONS ====================

function formatPollWithResults(poll: any, userId?: string) {
  const voteCounts: Record<string, number> = {};
  poll.options.forEach((opt: any) => {
    voteCounts[opt.id] = 0;
  });
  poll.votes.forEach((vote: any) => {
    voteCounts[vote.optionId] = (voteCounts[vote.optionId] || 0) + 1;
  });

  const userVote = userId ? poll.votes.find((v: any) => v.userId === userId) : null;

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    category: poll.category,
    status: poll.status,
    closesAt: poll.closesAt,
    createdAt: poll.createdAt,
    createdBy: {
      id: poll.createdBy.id,
      name: poll.createdBy.name
    },
    options: poll.options.map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      emoji: opt.emoji,
      voteCount: voteCounts[opt.id]
    })),
    totalVotes: poll.votes.length,
    userVote: userVote ? { optionId: userVote.optionId } : null
  };
}

// ==================== ROUTES ====================

/**
 * GET /api/polls
 * Get all polls for household
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    const polls = await prisma.poll.findMany({
      where: {
        householdId: req.user!.householdId,
        ...(status && { status: status as 'ACTIVE' | 'CLOSED' })
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        options: true,
        votes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(polls.map(poll => formatPollWithResults(poll, req.user!.id)));
  } catch (error) {
    console.error('[Polls] Get all error:', error);
    res.status(500).json({ message: 'Failed to fetch polls' });
  }
});

/**
 * GET /api/polls/:id
 * Get single poll with results
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pollId = getString(req.params.id);
    if (!pollId) return res.status(400).json({ message: 'Poll ID required' });

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        householdId: req.user!.householdId
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        options: true,
        votes: true
      }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    res.json(formatPollWithResults(poll, req.user!.id));
  } catch (error) {
    console.error('[Polls] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch poll' });
  }
});

/**
 * POST /api/polls
 * Create new poll (everyone can create)
 */
router.post('/', validate(createPollSchema), async (req: Request, res: Response) => {
  try {
    const { title, description, category, options, closesAt } = req.body;
    const householdId = req.user!.householdId;

    const poll = await prisma.poll.create({
      data: {
        title,
        description,
        category: category || 'OTHER',
        closesAt: closesAt ? new Date(closesAt) : null,
        householdId,
        createdById: req.user!.id,
        options: {
          create: options.map((opt: any) => ({
            text: opt.text,
            emoji: opt.emoji
          }))
        }
      },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        options: true,
        votes: true
      }
    });

    const formattedPoll = formatPollWithResults(poll, req.user!.id);

    // Emit to household
    emitToHousehold(householdId, 'poll:created', formattedPoll);

    res.status(201).json(formattedPoll);
  } catch (error) {
    console.error('[Polls] Create error:', error);
    res.status(500).json({ message: 'Failed to create poll' });
  }
});

/**
 * POST /api/polls/:id/vote
 * Vote on a poll (everyone can vote)
 */
router.post('/:id/vote', validate(voteSchema), async (req: Request, res: Response) => {
  try {
    const pollId = getString(req.params.id);
    if (!pollId) return res.status(400).json({ message: 'Poll ID required' });

    const { optionId } = req.body;
    const userId = req.user!.id;
    const householdId = req.user!.householdId;

    // Verify poll exists and is active
    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        householdId
      },
      include: { options: true }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (poll.status === 'CLOSED') {
      return res.status(400).json({ message: 'Poll is closed' });
    }

    // Verify option belongs to poll
    const validOption = poll.options.find(opt => opt.id === optionId);
    if (!validOption) {
      return res.status(400).json({ message: 'Invalid option' });
    }

    // Check if already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: { userId, pollId }
      }
    });

    if (existingVote) {
      // Update vote
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { optionId }
      });
    } else {
      // Create vote
      await prisma.vote.create({
        data: {
          userId,
          pollId,
          optionId
        }
      });
    }

    // Get updated poll
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        options: true,
        votes: true
      }
    });

    const formattedPoll = formatPollWithResults(updatedPoll, userId);

    // Emit to household
    emitToHousehold(householdId, 'poll:voted', {
      pollId,
      results: formattedPoll
    });

    res.json(formattedPoll);
  } catch (error) {
    console.error('[Polls] Vote error:', error);
    res.status(500).json({ message: 'Failed to vote' });
  }
});

/**
 * PATCH /api/polls/:id/close
 * Close a poll (admin/adult only)
 */
router.patch('/:id/close', requireAdult, async (req: Request, res: Response) => {
  try {
    const pollId = getString(req.params.id);
    if (!pollId) return res.status(400).json({ message: 'Poll ID required' });

    const householdId = req.user!.householdId;

    const poll = await prisma.poll.findFirst({
      where: { id: pollId, householdId }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED' },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        options: true,
        votes: true
      }
    });

    const formattedPoll = formatPollWithResults(updatedPoll, req.user!.id);

    // Emit to household
    emitToHousehold(householdId, 'poll:closed', formattedPoll);

    res.json(formattedPoll);
  } catch (error) {
    console.error('[Polls] Close error:', error);
    res.status(500).json({ message: 'Failed to close poll' });
  }
});

/**
 * DELETE /api/polls/:id
 * Delete a poll (admin/adult only)
 */
router.delete('/:id', requireAdult, async (req: Request, res: Response) => {
  try {
    const pollId = getString(req.params.id);
    if (!pollId) return res.status(400).json({ message: 'Poll ID required' });

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        householdId: req.user!.householdId
      }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    await prisma.poll.delete({
      where: { id: pollId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('[Polls] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete poll' });
  }
});

export default router;
