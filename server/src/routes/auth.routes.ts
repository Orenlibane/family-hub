import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { authMiddleware } from '../middleware/index.js';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  findOrCreateUser,
  generateToken
} from '../services/auth.service.js';
import { authenticateChild } from '../services/child-auth.service.js';

const router = Router();

/**
 * GET /auth/google
 * Redirect to Google OAuth
 */
router.get('/google', (_req: Request, res: Response) => {
  const authUrl = getGoogleAuthUrl();
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontendUrl}/login?error=missing_code`);
    }

    // Exchange code for user info
    const googleUser = await handleGoogleCallback(code);

    // Find or create user
    const { user, household, isNew } = await findOrCreateUser(googleUser);

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      householdId: household.id,
      role: user.role
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to frontend
    const redirectPath = isNew ? '/onboarding' : (user.role === 'KID' ? '/playground' : '/command-center');
    res.redirect(`${config.frontendUrl}${redirectPath}`);
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

/**
 * POST /auth/google/callback
 * Handle Google OAuth callback (for SPA flow)
 */
router.post('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code' });
    }

    const googleUser = await handleGoogleCallback(code);
    const { user, household } = await findOrCreateUser(googleUser);

    const token = generateToken({
      userId: user.id,
      householdId: household.id,
      role: user.role
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        famCoins: user.famCoins
      },
      household: {
        id: household.id,
        name: household.name,
        inviteCode: household.inviteCode
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Google callback error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

/**
 * GET /auth/me
 * Get current user
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Get full user with household
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { household: true }
    });

    if (!fullUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate fresh token for socket connection
    const token = generateToken({
      userId: fullUser.id,
      householdId: fullUser.householdId,
      role: fullUser.role
    });

    res.json({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
        avatarUrl: fullUser.avatarUrl,
        famCoins: fullUser.famCoins,
        avatarState: fullUser.avatarState
      },
      household: {
        id: fullUser.household.id,
        name: fullUser.household.name,
        inviteCode: fullUser.household.inviteCode,
        timezone: fullUser.household.timezone
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

/**
 * POST /auth/child/login
 * Login child with username and PIN
 */
router.post('/child/login', async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ message: 'Username and PIN are required' });
    }

    // Authenticate child
    const { user, household } = await authenticateChild(username, pin);

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      householdId: household.id,
      role: user.role
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        famCoins: user.famCoins
      },
      household: {
        id: household.id,
        name: household.name,
        inviteCode: household.inviteCode
      },
      token
    });
  } catch (error: any) {
    console.error('[Auth] Child login error:', error);
    res.status(401).json({ message: error.message || 'Invalid credentials' });
  }
});

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Import prisma for /me route
import { prisma } from '../services/prisma.service.js';

export default router;
