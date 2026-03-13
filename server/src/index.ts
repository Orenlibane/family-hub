import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { initSocketServer } from './services/socket.service.js';
import routes from './routes/index.js';

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

// Routes
app.use(routes);

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
