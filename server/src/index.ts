import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { initSocketServer } from './services/socket.service.js';
import routes from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.isDev ? false : undefined
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Initialize Socket.io
initSocketServer(httpServer);

// API Routes
app.use(routes);

// Serve static frontend in production
if (!config.isDev) {
  const frontendPath = join(__dirname, '../../public');
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     MishpachaHub Server Started       ║
  ╠═══════════════════════════════════════╣
  ║  Port: ${config.port}                            ║
  ║  Mode: ${config.nodeEnv.padEnd(27)}║
  ║  Frontend: ${config.frontendUrl.padEnd(23)}║
  ╚═══════════════════════════════════════╝
  `);
});

export { app, httpServer };
