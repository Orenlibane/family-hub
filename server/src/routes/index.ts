import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tasksRoutes from './tasks.routes.js';
import householdRoutes from './household.routes.js';
import rewardsRoutes from './rewards.routes.js';

const router = Router();

// Auth routes (no /api prefix)
router.use('/auth', authRoutes);

// API routes
router.use('/api/tasks', tasksRoutes);
router.use('/api/household', householdRoutes);
router.use('/api/rewards', rewardsRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
