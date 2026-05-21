const { connectDB, mongoose } = require('../config/database');
const User = require('../models/userModel');

async function testBackendFilter() {
  try {
    await connectDB();
    
    // Status active
    const activeUsers = await User.find({ role: 'USER', isBanned: false });
    console.log('Active Users Count in DB:', activeUsers.length);
    
    // Status banned
    const bannedUsers = await User.find({ role: 'USER', isBanned: true });
    console.log('Banned Users Count in DB:', bannedUsers.length);
    console.log('Banned Users:', bannedUsers.map(u => u.name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

testBackendFilter();
