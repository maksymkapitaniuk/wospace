const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshExpiresAt,
} = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/client/register', async (req, res) => {
  try {
    const { phone, email, name, surname, password, confirmPassword } = req.body;

    if (!phone || !email || !name || !surname || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Усі поля обовʼязкові' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Паролі не збігаються' });
    }

    const existing = await prisma.client.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Користувач з таким email або телефоном вже існує' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const client = await prisma.client.create({
      data: {
        full_name: `${name} ${surname}`,
        email,
        phone,
        password_hash,
      },
    });

    const payload = { id: client.client_id, role: 'client' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.clientSession.create({
      data: {
        client_id: client.client_id,
        refresh_token_hash: hashToken(refreshToken),
        expires_at: getRefreshExpiresAt(),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: client.client_id, full_name: client.full_name, email: client.email, phone: client.phone, role: 'client' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/client/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email та пароль обовʼязкові' });
    }

    const client = await prisma.client.findUnique({ where: { email } });
    if (!client) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const valid = await bcrypt.compare(password, client.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const payload = { id: client.client_id, role: 'client' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.clientSession.create({
      data: {
        client_id: client.client_id,
        refresh_token_hash: hashToken(refreshToken),
        expires_at: getRefreshExpiresAt(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: client.client_id, full_name: client.full_name, email: client.email, phone: client.phone, role: 'client' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/manager/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email та пароль обовʼязкові' });
    }

    const manager = await prisma.manager.findUnique({ where: { email } });
    if (!manager) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const valid = await bcrypt.compare(password, manager.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const payload = { id: manager.manager_id, role: 'manager' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.managerSession.create({
      data: {
        manager_id: manager.manager_id,
        refresh_token_hash: hashToken(refreshToken),
        expires_at: getRefreshExpiresAt(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: manager.manager_id, full_name: manager.full_name, email: manager.email, phone: manager.phone, role: 'manager' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email та пароль обовʼязкові' });
    }

    const admin = await prisma.administrator.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const payload = { id: admin.administrator_id, role: 'admin' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.administratorSession.create({
      data: {
        administrator_id: admin.administrator_id,
        refresh_token_hash: hashToken(refreshToken),
        expires_at: getRefreshExpiresAt(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: admin.administrator_id, full_name: admin.full_name, email: admin.email, phone: admin.phone, role: 'admin' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обовʼязковий' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: 'Невалідний refresh token' });
    }

    const tokenHash = hashToken(refreshToken);
    const { id, role } = decoded;

    let session;
    if (role === 'client') {
      session = await prisma.clientSession.findFirst({
        where: { client_id: id, refresh_token_hash: tokenHash, is_revoked: false },
      });
    } else if (role === 'manager') {
      session = await prisma.managerSession.findFirst({
        where: { manager_id: id, refresh_token_hash: tokenHash, is_revoked: false },
      });
    } else if (role === 'admin') {
      session = await prisma.administratorSession.findFirst({
        where: { administrator_id: id, refresh_token_hash: tokenHash, is_revoked: false },
      });
    }

    if (!session || session.expires_at < new Date()) {
      return res.status(401).json({ error: 'Сесія прострочена або відкликана' });
    }

    if (role === 'client') {
      await prisma.clientSession.update({
        where: { client_session_id: session.client_session_id },
        data: { is_revoked: true, updated_at: new Date() },
      });
    } else if (role === 'manager') {
      await prisma.managerSession.update({
        where: { manager_session_id: session.manager_session_id },
        data: { is_revoked: true, updated_at: new Date() },
      });
    } else if (role === 'admin') {
      await prisma.administratorSession.update({
        where: { administrator_session_id: session.administrator_session_id },
        data: { is_revoked: true, updated_at: new Date() },
      });
    }

    const payload = { id, role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    if (role === 'client') {
      await prisma.clientSession.create({
        data: { client_id: id, refresh_token_hash: hashToken(newRefreshToken), expires_at: getRefreshExpiresAt() },
      });
    } else if (role === 'manager') {
      await prisma.managerSession.create({
        data: { manager_id: id, refresh_token_hash: hashToken(newRefreshToken), expires_at: getRefreshExpiresAt() },
      });
    } else if (role === 'admin') {
      await prisma.administratorSession.create({
        data: { administrator_id: id, refresh_token_hash: hashToken(newRefreshToken), expires_at: getRefreshExpiresAt() },
      });
    }

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/logout', authenticate(), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обовʼязковий' });
    }

    const tokenHash = hashToken(refreshToken);
    const { id, role } = req.user;

    if (role === 'client') {
      await prisma.clientSession.updateMany({
        where: { client_id: id, refresh_token_hash: tokenHash },
        data: { is_revoked: true, updated_at: new Date() },
      });
    } else if (role === 'manager') {
      await prisma.managerSession.updateMany({
        where: { manager_id: id, refresh_token_hash: tokenHash },
        data: { is_revoked: true, updated_at: new Date() },
      });
    } else if (role === 'admin') {
      await prisma.administratorSession.updateMany({
        where: { administrator_id: id, refresh_token_hash: tokenHash },
        data: { is_revoked: true, updated_at: new Date() },
      });
    }

    res.json({ message: 'Вихід успішний' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/me', authenticate(), async (req, res) => {
  try {
    const { id, role } = req.user;
    let user;

    if (role === 'client') {
      user = await prisma.client.findUnique({ where: { client_id: id }, select: { client_id: true, full_name: true, email: true, phone: true } });
    } else if (role === 'manager') {
      user = await prisma.manager.findUnique({ where: { manager_id: id }, select: { manager_id: true, full_name: true, email: true, phone: true } });
    } else if (role === 'admin') {
      user = await prisma.administrator.findUnique({ where: { administrator_id: id }, select: { administrator_id: true, full_name: true, email: true, phone: true } });
    }

    if (!user) {
      return res.status(404).json({ error: 'Користувача не знайдено' });
    }

    res.json({ ...user, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
