import 'dotenv/config';

// Railway provides DATABASE_URL automatically when you add a PostgreSQL plugin
const isProduction = process.env.NODE_ENV === 'production';

// Railway provides RAILWAY_PUBLIC_DOMAIN for the deployed URL
const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : null;

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: !isProduction,

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ||
      (railwayUrl ? `${railwayUrl}/auth/google/callback` : 'http://localhost:3000/auth/google/callback')
  },

  // In production, frontend is served from same domain
  frontendUrl: process.env.FRONTEND_URL || railwayUrl || 'http://localhost:4200',

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@mishpacha.hub'
  },

  cors: {
    origin: isProduction
      ? (process.env.FRONTEND_URL || railwayUrl || true)
      : 'http://localhost:4200',
    credentials: true
  }
};
