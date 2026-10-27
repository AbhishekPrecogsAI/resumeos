import mongoose from 'mongoose';

mongoose.set('strictQuery', true);
// Reject query operators like $gt smuggled in via filter objects.
mongoose.set('sanitizeFilter', true);

export async function connectDatabase(uri, logger) {
  mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  logger.info('mongodb connected');
  return mongoose.connection;
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
