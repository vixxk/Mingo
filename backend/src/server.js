console.log('DEBUG: Loading app from', require.resolve('./app'));
const app = require('./app');
const config = require('./config/env');
const { connectDB, mongoose } = require('./config/database');
const http = require('http');
const { initSocket, getIo } = require('./socket');

const PORT = config.port;


const startServer = async () => {
  
  await connectDB();
  
  // Seed initial gifts
  const GiftService = require('./services/giftService');
  await GiftService.seedGifts();

  // Clean up stale sessions that survived a restart (active sessions with no billing activity)
  try {
    const Session = require('./models/sessionModel');
    const Listener = require('./models/listenerModel');
    const CallService = require('./services/callService');
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
    const staleSessions = await Session.find({
      status: 'active',
      $or: [
        { lastDeductionTime: { $exists: false } },
        { lastDeductionTime: null },
        { lastDeductionTime: { $lt: staleThreshold } },
      ]
    });
    for (const session of staleSessions) {
      const hasStarted = session.connectedAt != null || session.lastDeductionTime != null;
      if (!hasStarted) {
        session.status = 'cancelled';
        session.endTime = new Date();
        session.duration = 0;
        session.coinsDeducted = 0;
        session.listenerEarnings = 0;
        await session.save();
      } else {
        await CallService.endCall(session._id, session.userId).catch(err => {
          console.error('[Startup] Error ending stale connected session:', err.message);
        });
      }

      if (session.listenerId) {
        await Listener.findOneAndUpdate(
          { userId: session.listenerId.toString() },
          { isBusy: false, busySince: null }
        );
      }
    }
    if (staleSessions.length > 0) {
      console.log(`[Startup] Cleaned ${staleSessions.length} stale sessions from previous lifecycle`);
    }
  } catch (err) {
    console.error('[Startup] Error cleaning stale sessions:', err.message);
  }

  const server = http.createServer(app);
  initSocket(server);
  app.set('io', getIo());

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
