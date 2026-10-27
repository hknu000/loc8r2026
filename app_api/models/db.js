const mongoose = require('mongoose');

const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Loc8r';
let retryTimer;
let shuttingDown = false;

mongoose.connection.on('connected', () => {
  console.log(`Mongoose connected to ${mongoose.connection.name} on ${mongoose.connection.host}`);
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

const connect = () => {
  mongoose.connect(dbURI).catch((err) => {
    console.error('Mongoose initial connection failed:', err);
    if (!shuttingDown) {
      retryTimer = setTimeout(connect, 1000);
    }
  });
};

connect();

const gracefulShutdown = async (reason, callback) => {
  shuttingDown = true;
  clearTimeout(retryTimer);
  try {
    await mongoose.connection.close();
    console.log(`Mongoose connection closed: ${reason}`);
  } catch (err) {
    console.error(`Could not close Mongoose connection: ${reason}`, err);
  } finally {
    callback();
  }
};

process.once('SIGUSR2', () => {
  void gracefulShutdown('nodemon restart', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.once('SIGINT', () => {
  void gracefulShutdown('app termination', () => {
    process.exit(0);
  });
});

process.once('SIGTERM', () => {
  void gracefulShutdown('app shutdown', () => {
    process.exit(0);
  });
});

require('./locations');
