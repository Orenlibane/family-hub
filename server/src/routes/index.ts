import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tasksRoutes from './tasks.routes.js';
import householdRoutes from './household.routes.js';
import rewardsRoutes from './rewards.routes.js';
import adminRoutes from './admin.routes.js';
import pollsRoutes from './polls.routes.js';
import chatRoutes from './chat.routes.js';
import logisticsRoutes from './logistics.routes.js';
import setupRoutes from './setup.routes.js';

const router = Router();

// Auth routes (no /api prefix)
router.use('/auth', authRoutes);

// API routes
router.use('/api/tasks', tasksRoutes);
router.use('/api/household', householdRoutes);
router.use('/api/rewards', rewardsRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/polls', pollsRoutes);
router.use('/api/chat', chatRoutes);
router.use('/api/logistics', logisticsRoutes);
router.use('/api/setup', setupRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
