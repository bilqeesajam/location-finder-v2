import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io setup for real-time location sharing
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Location Finder Backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Track active connections
const activeUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Add user to active connections
  activeUsers.set(socket.id, {
    connectedAt: Date.now(),
    lastActivity: Date.now()
  });

  // Broadcast updated connection count
  io.emit('connections-update', { count: io.engine.clientsCount });

  // Handle location sharing
  socket.on('share-location', (locationData) => {
    console.log(`📍 Location received from ${socket.id}`);
    
    // Update user's last activity
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.lastActivity = Date.now();
      activeUsers.set(socket.id, user);
    }

    // Broadcast location to all other connected clients
    socket.broadcast.emit('location-update', {
      ...locationData,
      socketId: socket.id,
      timestamp: Date.now()
    });
  });

  // Handle joining location tracking rooms
  socket.on('join-location-room', (roomId) => {
    socket.join(roomId);
    console.log(`📍 Client ${socket.id} joined room: ${roomId}`);
  });

  // Handle leaving location tracking rooms
  socket.on('leave-location-room', (roomId) => {
    socket.leave(roomId);
    console.log(`📍 Client ${socket.id} left room: ${roomId}`);
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    
    // Remove from active users
    activeUsers.delete(socket.id);
    
    // Broadcast updated connection count
    io.emit('connections-update', { count: io.engine.clientsCount });
    
    // Notify others that user disconnected
    io.emit('user-disconnected', { 
      socketId: socket.id,
      timestamp: Date.now()
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, closing connections...');
  
  io.close(() => {
    console.log('✅ Socket.io server closed');
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Location Finder Backend`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API status: http://localhost:${PORT}/api/status`);
  console.log(`💬 Socket.io server ready`);
});

export { app, io, httpServer };