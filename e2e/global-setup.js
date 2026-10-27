import mongoose from 'mongoose';

// Start every E2E run from an empty database.
export default async function globalSetup() {
  const uri = process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/resumeos_e2e';
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  await conn.dropDatabase();
  await conn.close();
}
