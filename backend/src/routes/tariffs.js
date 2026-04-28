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

module.exports = router;
