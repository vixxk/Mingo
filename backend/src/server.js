console.log('DEBUG: Loading app from', require.resolve('./app'));
const app = require('./app');
const config = require('./config/env');
const { connectDB, mongoose } = require('./config/database');
const http = require('http');
const { initSocket } = require('./socket');

const PORT = config.port;


const startServer = async () => {
  
  await connectDB();
  
  // Seed initial gifts
  const GiftService = require('./services/giftService');
  await GiftService.seedGifts();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║        🎧  MINGO API SERVER  🎧          ║
  ║                                          ║
  ║   Environment : ${config.nodeEnv.padEnd(22)}║
  ║   Port        : ${String(PORT).padEnd(22)}║
  ║   URL         : http://localhost:${String(PORT).padEnd(8)}║
  ║   Database    : MongoDB                  ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
    `);
  });
};


const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB:', err.message);
  }

  try {
    const { redis } = require('./config/redis');
    if (redis && redis.status === 'ready') {
      await redis.quit();
      console.log('🔴 Redis connection closed');
    }
  } catch (err) {
    console.error('Error closing Redis:', err.message);
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  process.exit(1);
});

startServer();
