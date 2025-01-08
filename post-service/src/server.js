require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const postRoutes = require('./routes/post-routes');
const { connectToRabbitMQ, publishEvent } = require('./utils/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to mongodb'))
  .catch(e => logger.error('Mongo connection error', e));

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// Ip based rate limiting for sensitive endpoints
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      logger.warn(`Rate limiter exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests',
      });
    });
});

// sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests',
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// apply this sensitiveEndpointsLimiter to our routes
app.use('/api/posts/create-post', sensitiveEndpointsLimiter);

//routes -> pass redisClient to the post routes
app.use(
  '/api/posts',
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes,
);

// error handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to connect to server', error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason);
});
