const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

/**
 * 1. Client creates a ride request
 */
router.post('/request', async (req, res) => {
  const { requesterId, serviceType, originLat, originLng, destLat, destLng } = req.body;

  try {
    const ride = await prisma.ride.create({
      data: {
        requesterId,
        serviceType,
        originLat,
        originLng,
        destLat,
        destLng,
        status: 'requested',
      },
    });

    // Find providers near origin who match serviceType
    const providers = await prisma.user.findMany({
      where: {
        isProvider: true,
        serviceType, // assuming future serviceType field
        currentLat: { not: null },
        currentLng: { not: null },
      },
    });

    // Broadcast request to potential providers via socket
    providers.forEach((provider) => {
      if (provider.socketId) {
        req.io.to(provider.socketId).emit('ride_request', { ride });
      }
    });

    res.json(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ride request failed' });
  }
});

/**
 * 2. Provider accepts ride
 */
router.post('/accept', async (req, res) => {
  const { rideId, providerId } = req.body;

  try {
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        providerId,
        status: 'accepted',
      },
    });

    // Notify requester
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { requester: true },
    });

    if (ride?.requester?.socketId) {
      req.io.to(ride.requester.socketId).emit('ride_accepted', updatedRide);
    }

    res.json(updatedRide);
  } catch (err) {
    res.status(500).json({ error: 'Ride acceptance failed' });
  }
});

/**
 * 3. Update ride status
 */
router.post('/status', async (req, res) => {
  const { rideId, status } = req.body;

  try {
    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

/**
 * 4. Get ride details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: { requester: true, provider: true },
  });

  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

module.exports = router;
