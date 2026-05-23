const { connectDB, mongoose } = require('../config/database');
const Listener = require('../models/listenerModel');
const User = require('../models/userModel');

async function checkListeners() {
  try {
    await connectDB();
    
    const listeners = await Listener.find().populate('userId', 'name username role');
    console.log(`Found ${listeners.length} total listeners in DB:`);
    listeners.forEach((l, index) => {
      console.log(`[${index + 1}] ID: ${l._id}`);
      console.log(`    displayName: ${l.displayName}`);
      console.log(`    status: ${l.status}`);
      console.log(`    verified: ${l.verified}`);
      console.log(`    createdAt: ${l.createdAt}`);
      console.log(`    userId:`, l.userId ? {
        id: l.userId._id,
        name: l.userId.name,
        username: l.userId.username,
        role: l.userId.role
      } : 'NULL');
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

checkListeners();
