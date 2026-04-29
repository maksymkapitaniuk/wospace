require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const bookingRoutes = require('./src/routes/bookings');
const adminRoutes = require('./src/routes/admin');
const workspaceRoutes = require('./src/routes/workspaces');
const serviceRoutes = require('./src/routes/services');
const categoryRoutes = require('./src/routes/categories');
const tariffRoutes = require('./src/routes/tariffs');
const analyticsRoutes = require('./src/routes/analytics');
const userRoutes = require('./src/routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tariffs', tariffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});