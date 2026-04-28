const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate(['client', 'manager', 'admin']), async (req, res) => {
  try {
    const { id, role } = req.user;
    let where = {};

    if (role === 'client') {
      where.client_id = id;
      where.start_time = { gte: new Date() };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        workspace: { include: { category: true } },
        client: { select: { client_id: true, full_name: true, email: true, phone: true } },
        bookingServices: { include: { service: true } },
        subscription: true,
      },
      orderBy: { start_time: 'asc' },
    });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/:id', authenticate(['client', 'manager', 'admin']), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
      include: {
        workspace: { include: { category: true } },
        client: { select: { client_id: true, full_name: true, email: true, phone: true } },
        bookingServices: { include: { service: true } },
        subscription: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Бронювання не знайдено' });
    }

    if (req.user.role === 'client' && booking.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостатньо прав' });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate(['client', 'manager']), async (req, res) => {
  try {
    const { workspace_id, start_time, end_time, services, subscription_id, client_id } = req.body;

    let targetClientId;
    if (req.user.role === 'manager') {
      if (!client_id) {
        return res.status(400).json({ error: 'Менеджер повинен вказати client_id' });
      }
      targetClientId = client_id;
    } else {
      targetClientId = req.user.id;
    }

    if (!workspace_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'workspace_id, start_time та end_time обовʼязкові' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'end_time повинен бути після start_time' });
    }

    const workspace = await prisma.workspace.findUnique({ where: { workspace_id } });
    if (!workspace || !workspace.is_active) {
      return res.status(404).json({ error: 'Робоче місце не знайдено або неактивне' });
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        workspace_id,
        start_time: { lt: endDate },
        end_time: { gt: startDate },
      },
    });
    if (conflict) {
      return res.status(409).json({ error: 'Цей час вже зайнятий для обраного робочого місця' });
    }

    const hours = (endDate - startDate) / (1000 * 60 * 60);
    let total_price = parseFloat(workspace.base_price) * hours;

    let servicesToCreate = [];
    if (services && services.length > 0) {
      const serviceIds = services.map(s => s.service_id);
      const dbServices = await prisma.service.findMany({ where: { service_id: { in: serviceIds } } });
      for (const s of services) {
        const dbService = dbServices.find(ds => ds.service_id === s.service_id);
        if (dbService) {
          const qty = s.quantity || 1;
          total_price += parseFloat(dbService.price) * qty;
          servicesToCreate.push({ service_id: s.service_id, quantity: qty });
        }
      }
    }

    let subscriptionIdToUse = null;
    if (subscription_id) {
      const sub = await prisma.subscription.findUnique({ where: { subscription_id } });
      if (sub && sub.client_id === targetClientId && !sub.is_cancelled && sub.visits_left > 0) {
        subscriptionIdToUse = subscription_id;
        await prisma.subscription.update({
          where: { subscription_id },
          data: { visits_left: sub.visits_left - 1 },
        });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        client_id: targetClientId,
        workspace_id,
        subscription_id: subscriptionIdToUse,
        start_time: startDate,
        end_time: endDate,
        total_price,
        bookingServices: {
          create: servicesToCreate,
        },
      },
      include: {
        workspace: { include: { category: true } },
        bookingServices: { include: { service: true } },
      },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/:id', authenticate(['client', 'manager']), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const existing = await prisma.booking.findUnique({ where: { booking_id: bookingId } });

    if (!existing) {
      return res.status(404).json({ error: 'Бронювання не знайдено' });
    }

    if (req.user.role === 'client' && existing.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостатньо прав' });
    }

    const { workspace_id, start_time, end_time, services } = req.body;

    const wsId = workspace_id || existing.workspace_id;
    const startDate = start_time ? new Date(start_time) : existing.start_time;
    const endDate = end_time ? new Date(end_time) : existing.end_time;

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'end_time повинен бути після start_time' });
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        workspace_id: wsId,
        booking_id: { not: bookingId },
        start_time: { lt: endDate },
        end_time: { gt: startDate },
      },
    });
    if (conflict) {
      return res.status(409).json({ error: 'Цей час вже зайнятий для обраного робочого місця' });
    }

    const workspace = await prisma.workspace.findUnique({ where: { workspace_id: wsId } });
    const hours = (endDate - startDate) / (1000 * 60 * 60);
    let total_price = parseFloat(workspace.base_price) * hours;

    if (services) {
      await prisma.bookingService.deleteMany({ where: { booking_id: bookingId } });
      for (const s of services) {
        const dbService = await prisma.service.findUnique({ where: { service_id: s.service_id } });
        if (dbService) {
          const qty = s.quantity || 1;
          total_price += parseFloat(dbService.price) * qty;
          await prisma.bookingService.create({
            data: { booking_id: bookingId, service_id: s.service_id, quantity: qty },
          });
        }
      }
    } else {
      const existingServices = await prisma.bookingService.findMany({
        where: { booking_id: bookingId },
        include: { service: true },
      });
      for (const bs of existingServices) {
        total_price += parseFloat(bs.service.price) * bs.quantity;
      }
    }

    const booking = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: {
        workspace_id: wsId,
        start_time: startDate,
        end_time: endDate,
        total_price,
      },
      include: {
        workspace: { include: { category: true } },
        bookingServices: { include: { service: true } },
      },
    });

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate(['client', 'manager']), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const existing = await prisma.booking.findUnique({ where: { booking_id: bookingId } });

    if (!existing) {
      return res.status(404).json({ error: 'Бронювання не знайдено' });
    }

    if (req.user.role === 'client' && existing.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостатньо прав' });
    }

    if (existing.subscription_id) {
      await prisma.subscription.update({
        where: { subscription_id: existing.subscription_id },
        data: { visits_left: { increment: 1 } },
      });
    }

    await prisma.booking.delete({ where: { booking_id: bookingId } });
    res.json({ message: 'Бронювання видалено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
