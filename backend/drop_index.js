const mongoose = require('mongoose');
const env = require('./src/config/env.js');

async function run() {
  await mongoose.connect(env.mongo.uri);
  try {
    await mongoose.connection.collection('users').dropIndex('email_1');
    console.log('Index dropped');
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}
run();
