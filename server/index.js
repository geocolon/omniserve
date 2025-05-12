require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const { setupSocket } = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Inject io into req object so routes can access it
app.use((req, res, next) => {
    req.io = io;
    next();
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);

// Socket.IO
setupSocket(io);

// Launch
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
