import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './trpc';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health', // Don't log health checks
  },
  customLogLevel: (_, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
}));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      logger.error({ path, error: error.message }, `tRPC Error: ${path}`);
    },
  })
);

// Connect to database on startup (avoids cold start latency)
async function start() {
  try {
    await prisma.$connect();
    logger.info('📦 Database connected');
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
    });
  } catch (error) {
    logger.error(error, 'Failed to connect to database');
    process.exit(1);
  }
}

start();

