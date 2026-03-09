const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const orderRoutes = require('./routes/orderRoutes');
const restaurantOwnerRoutes = require('./routes/restaurantOwnerRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const { initializeSocketServer } = require('./socket/socketServer');
const { initializePendingOrderTimers } = require('./services/orderTimerService');

dotenv.config();
connectDB();

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'JPT Express API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurant', restaurantOwnerRoutes);
app.use('/api/delivery', deliveryRoutes);

app.use(errorHandler);

initializeSocketServer(httpServer);
initializePendingOrderTimers().catch((error) => {
  console.error('Failed to initialize pending order timers:', error.message);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
