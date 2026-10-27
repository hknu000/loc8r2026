const mongoose = require('mongoose');

const dbPassword = process.env.MONGODB_PASSWORD;
if (!dbPassword) {
  throw new Error('Set MONGODB_PASSWORD in .env or the server environment to connect to MongoDB Atlas.');
}
const dbURI = `mongodb+srv://atlasuser:${encodeURIComponent(dbPassword)}@cluster0.srdvdzs.mongodb.net/Loc8r?retryWrites=true&w=majority`;
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
