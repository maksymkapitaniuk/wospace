const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tariffs = await prisma.tariff.findMany({
      where: { is_enabled: true },
      orderBy: { name: 'asc' },
    });
    res.json(tariffs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/subscriptions', authenticate(['client']), async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { client_id: req.user.id },
      include: { tariff: true },
      orderBy: { start_date: 'desc' },
    });
    res.json(subscriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/:id/subscribe', authenticate(['client']), async (req, res) => {
  try {
    const tariffId = parseInt(req.params.id);
    const tariff = await prisma.tariff.findUnique({ where: { tariff_id: tariffId } });

    if (!tariff || !tariff.is_enabled) {
      return res.status(404).json({ error: 'Тариф не знайдено або неактивний' });
    }

    const details = tariff.details;
    const durationDays = details.duration_days || 30;
    const visitsLimit = details.visits_limit || null;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const subscription = await prisma.subscription.create({
      data: {
        client_id: req.user.id,
        tariff_id: tariffId,
        start_date: startDate,
        end_date: endDate,
        visits_left: visitsLimit,
      },
      include: { tariff: true },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error(err);
    const msg = err.message || '';
    if (msg.includes('вже має активну підписку')) {
      return res.status(409).json({ error: 'У вас вже є активна підписка. Дочекайтесь її завершення або скасуйте поточну.' });
    }
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.patch('/subscriptions/:id/cancel', authenticate(['client']), async (req, res) => {
  try {
    const subId = parseInt(req.params.id);
    const sub = await prisma.subscription.findUnique({ where: { subscription_id: subId } });

    if (!sub) {
      return res.status(404).json({ error: 'Підписку не знайдено' });
    }
    if (sub.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Недостатньо прав' });
    }
    if (sub.is_cancelled) {
      return res.status(400).json({ error: 'Підписку вже скасовано' });
    }

    const updated = await prisma.subscription.update({
      where: { subscription_id: subId },
      data: { is_cancelled: true },
      include: { tariff: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/subscriptions/check', authenticate(['manager']), async (req, res) => {
  try {
    const { identifier } = req.query;
    if (!identifier) return res.status(400).json({ error: 'Параметр identifier обовʼязковий' });

    const client = await prisma.client.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (!client) return res.json({ has_subscription: false });

    const now = new Date();
    const active = await prisma.subscription.findFirst({
      where: {
        client_id: client.client_id,
        is_cancelled: false,
        OR: [{ visits_left: { gt: 0 } }, { visits_left: null }],
        end_date: { gte: now },
      },
    });

    res.json({ has_subscription: !!active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
