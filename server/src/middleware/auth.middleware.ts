import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JwtPayload, AuthenticatedUser } from '../types/index.js';
import { prisma } from '../services/prisma.service.js';

/**
 * Extracts and verifies JWT from cookies
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        householdId: true,
        famCoins: true
      }
    });

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = user as AuthenticatedUser;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Optional auth - populates user if token exists but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          householdId: true,
          famCoins: true
        }
      });

      if (user) {
        req.user = user as AuthenticatedUser;
      }
    }
  } catch {
    // Token invalid, continue without user
  }

  next();
};
