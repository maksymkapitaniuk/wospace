const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function parseBookingError(err) {
  const msg = err.message || '';
  if (msg.includes('перетинається з іншим бронюванням') || msg.includes('trg_bookings_no_overlap')) {
    return 'Цей час вже зайнятий для обраного робочого місця';
  }
  if (msg.includes('bookings_end_time_bigger_check')) {
    return 'Час кінця повинен бути після часу початку';
  }
  if (msg.includes('bookings_end_time_same_day_check')) {
    return 'Початок та кінець бронювання повинні бути в один день';
  }
  if (msg.includes('bookings_total_price_non_negative_check') || msg.includes('bookings_total_price_positive_check')) {
    return 'Загальна ціна не може бути відʼємною';
  }
  if (msg.includes('booking_services_quantity_positive_check')) {
    return 'Кількість послуг повинна бути більше 0';
  }
  return null;
}

router.get('/', authenticate(['client', 'manager', 'admin']), async (req, res) => {
  try {
    const { id, role } = req.user;
    const { period = 'upcoming', page = '1', limit = '10', from, to } = req.query;
    const take = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
    const now = new Date();

    let where = {};

    if (role === 'client') {
      where.client_id = id;
    }

    if (from && to) {
      where.start_time = { gte: new Date(from), lt: new Date(to) };
    } else if (period === 'past') {
      where.start_time = { lt: now };
    } else {
      where.start_time = { gte: now };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          workspace: { include: { category: true } },
          client: { select: { client_id: true, full_name: true, email: true, phone: true } },
          bookingServices: { include: { service: true } },
          subscription: true,
        },
        orderBy: { start_time: period === 'past' ? 'desc' : 'asc' },
        ...( (from && to) ? {} : { skip, take } ),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ data: bookings, total, page: Math.max(parseInt(page) || 1, 1), limit: take });
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Невалідний формат дати/часу' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Час кінця повинен бути після часу початку' });
    }

    if (startDate.toDateString() !== endDate.toDateString()) {
      return res.status(400).json({ error: 'Початок та кінець бронювання повинні бути в один день' });
    }

    if (startDate < new Date()) {
      return res.status(400).json({ error: 'Не можна створити бронювання на минулу дату або час' });
    }

    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();
    if (startHour < 8 || startHour >= 20 || endHour > 20 || (endHour === 20 && endMin > 0)) {
      return res.status(400).json({ error: 'Бронювання можливе лише в робочий час: з 08:00 до 20:00' });
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
    const activeSub = await prisma.subscription.findFirst({
      where: {
        client_id: targetClientId,
        is_cancelled: false,
        OR: [
          { visits_left: { gt: 0 } },
          { visits_left: null },
        ],
        end_date: { gte: new Date() },
      },
    });
    if (activeSub) {
      subscriptionIdToUse = activeSub.subscription_id;
      total_price = 0;
      if (activeSub.visits_left !== null) {
        await prisma.subscription.update({
          where: { subscription_id: activeSub.subscription_id },
          data: { visits_left: activeSub.visits_left - 1 },
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
    const constraintMsg = parseBookingError(err);
    if (constraintMsg) {
      return res.status(400).json({ error: constraintMsg });
    }
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
      return res.status(400).json({ error: 'Час кінця повинен бути після часу початку' });
    }

    if (startDate.toDateString() !== endDate.toDateString()) {
      return res.status(400).json({ error: 'Початок та кінець бронювання повинні бути в один день' });
    }

    if (startDate < new Date()) {
      return res.status(400).json({ error: 'Не можна змінити бронювання на минулу дату або час' });
    }

    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();
    if (startHour < 8 || startHour >= 20 || endHour > 20 || (endHour === 20 && endMin > 0)) {
      return res.status(400).json({ error: 'Бронювання можливе лише в робочий час: з 08:00 до 20:00' });
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
    const constraintMsg = parseBookingError(err);
    if (constraintMsg) {
      return res.status(400).json({ error: constraintMsg });
    }
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
