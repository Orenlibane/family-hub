import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from './prisma.service.js';
import { JwtPayload, ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/index.js';
import { Mood } from '@prisma/client';

let io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = payload.userId;
      socket.data.householdId = payload.householdId;
      socket.data.role = payload.role;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.data.userId}`);

    // Event handlers
    setupEventHandlers(socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.data.userId}, reason: ${reason}`);
    });
  });

  return io;
};

const setupEventHandlers = (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
  // Join household room
  socket.on('household:join', ({ householdId }) => {
    // Verify user belongs to household
    if (socket.data.householdId === householdId) {
      socket.join(`household:${householdId}`);
      console.log(`[Socket] User ${socket.data.userId} joined household ${householdId}`);
    }
  });

  // Task completion
  socket.on('task:complete', async ({ taskId }, callback) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task || task.householdId !== socket.data.householdId) {
        callback({ success: false, coinsEarned: 0 });
        return;
      }

      // Update task and user coins atomically
      const [updatedTask, user] = await prisma.$transaction([
        prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedById: socket.data.userId
          }
        }),
        prisma.user.update({
          where: { id: socket.data.userId },
          data: {
            famCoins: { increment: task.coinReward }
          }
        })
      ]);

      // Broadcast to household
      io.to(`household:${socket.data.householdId}`).emit('task:completed', {
        task: updatedTask,
        coinsEarned: task.coinReward
      });

      io.to(`household:${socket.data.householdId}`).emit('coins:changed', {
        userId: socket.data.userId,
        amount: task.coinReward,
        newBalance: user.famCoins,
        reason: `Completed: ${task.title}`
      });

      callback({ success: true, coinsEarned: task.coinReward });
    } catch (error) {
      console.error('[Socket] Task complete error:', error);
      callback({ success: false, coinsEarned: 0 });
    }
  });

  // Mood update
  socket.on('mood:update', async ({ mood, note }, callback) => {
    try {
      await prisma.moodLog.create({
        data: {
          mood: mood as Mood,
          note,
          userId: socket.data.userId,
          householdId: socket.data.householdId
        }
      });

      // Broadcast to household
      io.to(`household:${socket.data.householdId}`).emit('mood:updated', {
        userId: socket.data.userId,
        mood
      });

      callback({ success: true });
    } catch (error) {
      console.error('[Socket] Mood update error:', error);
      callback({ success: false });
    }
  });

  // Presence heartbeat
  socket.on('presence:heartbeat', () => {
    // Update last seen timestamp (could store in Redis for production)
    console.log(`[Socket] Heartbeat from ${socket.data.userId}`);
  });
};

// Helper functions to emit events from routes
export const emitToHousehold = <E extends keyof ServerToClientEvents>(
  householdId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void => {
  io.to(`household:${householdId}`).emit(event, ...args);
};

export const emitToUser = <E extends keyof ServerToClientEvents>(
  userId: string,
  event: E,
  ...args: Parameters<ServerToClientEvents[E]>
): void => {
  // Find sockets for user and emit
  io.sockets.sockets.forEach((socket) => {
    if (socket.data.userId === userId) {
      socket.emit(event, ...args);
    }
  });
};

export const getSocketIO = (): Server => io;
