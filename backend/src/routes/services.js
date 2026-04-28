const express = require('express');
const prisma = require('../prismaClient');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const service = await prisma.service.findUnique({ where: { service_id: serviceId } });

    if (!service) {
      return res.status(404).json({ error: 'Послугу не знайдено' });
    }

    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
