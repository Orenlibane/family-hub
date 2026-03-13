import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Requires specific roles to access route
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Requires ADMIN role
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Requires ADMIN or ADULT role
 */
export const requireAdult = requireRole('ADMIN', 'ADULT');

/**
 * Requires KID role
 */
export const requireKid = requireRole('KID');
