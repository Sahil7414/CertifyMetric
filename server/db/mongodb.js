// =============================================================================
// CertifyMetric — MongoDB Atlas Connection Manager
// =============================================================================
import mongoose from 'mongoose';

let isConnecting = false;

/**
 * Connects to MongoDB Atlas using MONGODB_URI and MONGODB_DB_NAME.
 * Reuses existing connection across requests and handles connection lifecycle.
 */
export async function connectMongo(customUri = null) {
  // If already connected (readyState 1 = connected)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently in the process of connecting, wait for it
  if (isConnecting) {
    let waited = 0;
    while (isConnecting && waited < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      waited++;
    }
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
  }

  const uri = customUri || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'certifymetric';

  if (!uri || uri.trim().length === 0) {
    const errorMsg = 'MongoDB: MONGODB_URI environment variable is missing. Set MONGODB_URI to your MongoDB Atlas connection string.';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  isConnecting = true;
  console.log('MongoDB: connecting...');

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      autoIndex: true
    });

    isConnecting = false;
    console.log('MongoDB: connected');
    return mongoose.connection;
  } catch (err) {
    isConnecting = false;
    console.error('❌ MongoDB: connection failed -', err.message);
    throw new Error(`MongoDB connection failed: ${err.message}`);
  }
}

/**
 * Returns current MongoDB connectivity state for health checks.
 */
export function getMongoStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const stateCode = mongoose.connection.readyState;
  return {
    connected: stateCode === 1,
    status: states[stateCode] || 'unknown'
  };
}

/**
 * Gracefully disconnects from MongoDB upon server shutdown.
 */
export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB: disconnected cleanly');
  }
}

export default connectMongo;
