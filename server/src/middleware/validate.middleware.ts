import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates request body against a Zod schema
 */
export const validate = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));

        res.status(422).json({
          message: 'Validation failed',
          errors
        });
        return;
      }

      res.status(500).json({ message: 'Validation error' });
    }
  };
};

/**
 * Validates request query params against a Zod schema
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));

        res.status(422).json({
          message: 'Validation failed',
          errors
        });
        return;
      }

      res.status(500).json({ message: 'Validation error' });
    }
  };
};

/**
 * Validates request params against a Zod schema
 */
export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));

        res.status(422).json({
          message: 'Validation failed',
          errors
        });
        return;
      }

      res.status(500).json({ message: 'Validation error' });
    }
  };
};
