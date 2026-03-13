import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { config } from '../config/index.js';
import { prisma } from './prisma.service.js';
import { JwtPayload } from '../types/index.js';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.callbackUrl
);

/**
 * Generate Google OAuth URL
 */
export const getGoogleAuthUrl = (): string => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
};

/**
 * Exchange auth code for tokens and get user info
 */
export const handleGoogleCallback = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email || !data.id) {
    throw new Error('Failed to get user info from Google');
  }

  return {
    googleId: data.id,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    avatarUrl: data.picture
  };
};

/**
 * Find or create user and household
 */
export const findOrCreateUser = async (googleUserData: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}) => {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { googleId: googleUserData.googleId },
    include: { household: true }
  });

  if (user) {
    return { user, household: user.household, isNew: false };
  }

  // Check if email exists (different Google account)
  user = await prisma.user.findUnique({
    where: { email: googleUserData.email },
    include: { household: true }
  });

  if (user) {
    // Link Google ID to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleUserData.googleId },
      include: { household: true }
    });
    return { user, household: user.household, isNew: false };
  }

  // Create new household and user (as ADMIN)
  const household = await prisma.household.create({
    data: {
      name: `${googleUserData.name}'s Family`
    }
  });

  user = await prisma.user.create({
    data: {
      googleId: googleUserData.googleId,
      email: googleUserData.email,
      name: googleUserData.name,
      avatarUrl: googleUserData.avatarUrl,
      role: 'ADMIN',
      householdId: household.id
    },
    include: { household: true }
  });

  return { user, household, isNew: true };
};

/**
 * Join existing household via invite code
 */
export const joinHousehold = async (
  userId: string,
  inviteCode: string,
  role: 'ADULT' | 'KID'
) => {
  const household = await prisma.household.findUnique({
    where: { inviteCode }
  });

  if (!household) {
    throw new Error('Invalid invite code');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      householdId: household.id,
      role
    },
    include: { household: true }
  });

  return { user, household };
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};
