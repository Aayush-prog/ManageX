import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Trust first proxy (Nginx) so req.ip reflects the real client IP
app.set('trust proxy', 1);

// Disable ETags so API responses are never cached (prevents 304s on dynamic data)
app.set('etag', false);
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Cookie parser (must come before routes)
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Serve uploaded files as static
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

export default app;
