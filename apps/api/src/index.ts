import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import v1Routes from './routes/v1/index';
import { errorHandler } from './middleware/errorHandler';
import { redis } from './db/redis';
import { ensureFoodCatalog } from './db/ensureFoodCatalog';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.nodeEnv === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nutrimind-api', version: '1.0.0' });
});

app.use('/api/v1', v1Routes);

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (API kept alive):', reason);
});

async function start() {
  try {
    await redis.connect().catch(() => console.warn('Redis not available, caching disabled'));
  } catch {
    /* optional */
  }

  try {
    const added = await ensureFoodCatalog();
    if (added > 0) console.log(`Food catalog: added ${added} new items`);
  } catch (e) {
    console.warn('Food catalog sync skipped (is Postgres running?):', (e as Error).message);
  }

  const server = app.listen(config.port, () => {
    console.log(`NutriMind API running on http://localhost:${config.port}`);
    console.log(`Medical disclaimer: ${config.medicalDisclaimer}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${config.port} is already in use. Run: npm run predev\nThen restart with: npm run dev\n`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start();
