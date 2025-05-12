const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 New socket connected: ${socket.id}`);

    socket.on('register_socket', async ({ userId }) => {
      await prisma.user.update({
        where: { id: userId },
        data: { socketId: socket.id },
      });
    });

    socket.on('location_update', async ({ userId, lat, lng }) => {
      await prisma.user.update({
        where: { id: userId },
        data: { currentLat: lat, currentLng: lng },
      });
      socket.broadcast.emit('provider_location', { userId, lat, lng });
    });

    socket.on('send_message', async ({ fromId, toId, rideId, content }) => {
      const message = await prisma.message.create({
        data: { fromId, toId, rideId, content },
      });

      const toUser = await prisma.user.findUnique({ where: { id: toId } });
      if (toUser?.socketId) {
        io.to(toUser.socketId).emit('receive_message', message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
