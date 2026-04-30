const { connectDB, mongoose } = require('./database');


require('../models/userModel');
require('../models/listenerModel');
require('../models/sessionModel');
require('../models/ratingModel');

async function initDatabase() {
  try {
    console.log('🚀 Initializing Mingo database...');
    await connectDB();

    
    const models = mongoose.modelNames();
    for (const modelName of models) {
      await mongoose.model(modelName).syncIndexes();
      console.log(`  ✓ Indexes synced for ${modelName}`);
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  } finally {
    await mongoose.connection.close();
  }
}

initDatabase();
