import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, validate } from '../middleware/index.js';
import { prisma } from '../services/prisma.service.js';
import { getString } from '../utils/helpers.js';
import { emitToHousehold } from '../services/socket.service.js';

const router = Router();

router.use(authMiddleware);

// ==================== SCHEMAS ====================

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000)
});

// ==================== ROUTES ====================

/**
 * GET /api/chat/messages
 * Get chat messages (paginated)
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;
    const householdId = req.user!.householdId;

    const messages = await prisma.chatMessage.findMany({
      where: { householdId },
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1 // Skip the cursor itself
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            avatarState: true
          }
        }
      }
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop(); // Remove the extra one

    // Return in chronological order for display
    const orderedMessages = messages.reverse();

    res.json({
      messages: orderedMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender
      })),
      hasMore,
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null
    });
  } catch (error) {
    console.error('[Chat] Get messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/chat/messages
 * Send a chat message
 */
router.post('/messages', validate(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const householdId = req.user!.householdId;
    const senderId = req.user!.id;

    const message = await prisma.chatMessage.create({
      data: {
        content,
        senderId,
        householdId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            avatarState: true
          }
        }
      }
    });

    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender
    };

    // Emit to household
    emitToHousehold(householdId, 'chat:message', formattedMessage);

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('[Chat] Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

/**
 * DELETE /api/chat/messages/:id
 * Delete own message (or admin can delete any)
 */
router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const messageId = getString(req.params.id);
    if (!messageId) return res.status(400).json({ message: 'Message ID required' });

    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        householdId: req.user!.householdId
      }
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only allow deletion of own messages or if admin
    if (message.senderId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete this message' });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('[Chat] Delete message error:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

export default router;
