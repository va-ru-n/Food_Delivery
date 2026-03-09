const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { setSocketInstance } = require('./socketEmitter');

const resolveToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return String(authToken).replace(/^Bearer\s+/i, '');

  const header = socket.handshake?.headers?.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  return null;
};

const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = resolveToken(socket);
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    if (socket.user.role === 'customer') {
      socket.join(`customer:${userId}`);
    }

    if (socket.user.role === 'delivery') {
      socket.join(`delivery:${userId}`);
    }

    if (socket.user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ owner: socket.user._id }).select('_id');
      if (restaurant) {
        socket.join(`restaurant:${String(restaurant._id)}`);
      }
    }

    socket.on('disconnect', () => {
      // Room cleanup is automatic on disconnect.
    });
  });

  setSocketInstance(io);
  return io;
};

module.exports = { initializeSocketServer };
