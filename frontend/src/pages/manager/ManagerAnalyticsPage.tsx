import { useState, useEffect } from 'react';
import api from '../../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';

interface SummaryData {
  bookings_30d: number;
  bookings_7d: number;
  revenue_30d: number;
  unique_clients_30d: number;
}

interface OccupancyRow { hour: string; count: number }
interface DailyRow { day: string; count: number }
interface WorkspaceRow { name: string; bookings: number; revenue: number }
interface CategoryRow { name: string; bookings: number }
interface ServiceRow { name: string; usage_count: number; total_quantity: number; revenue: number }
interface ClientRow { full_name: string; email: string; phone: string; bookings: number; total_spent: number }
interface RevenueRow { day: string; revenue: number }

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#4f46e5', '#65a30d', '#ea580c'];

export default function ManagerAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/occupancy'),
      api.get('/analytics/occupancy-daily'),
      api.get('/analytics/workspaces'),
      api.get('/analytics/categories'),
      api.get('/analytics/services'),
      api.get('/analytics/clients'),
      api.get('/analytics/revenue'),
    ]).then(([s, o, d, w, cat, svc, cl, rev]) => {
      setSummary(s.data);
      setOccupancy(o.data);
      setDaily(d.data);
      setWorkspaces(w.data);
      setCategories(cat.data);
      setServices(svc.data);
      setClients(cl.data);
      setRevenue(rev.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page analytics-page">
      <h1>Аналітика</h1>
      <p className="analytics-subtitle">Дані за останні 30 днів</p>

      {summary && (
        <div className="analytics-summary">
          <div className="summary-card">
            <span className="summary-value">{summary.bookings_30d}</span>
            <span className="summary-label">Бронювань (30д)</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{summary.bookings_7d}</span>
            <span className="summary-label">Бронювань (7д)</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{summary.revenue_30d.toFixed(0)} ₴</span>
            <span className="summary-label">Дохід (30д)</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{summary.unique_clients_30d}</span>
            <span className="summary-label">Унікальних клієнтів</span>
          </div>
        </div>
      )}

      <div className="analytics-grid">
        <div className="analytics-card analytics-card-wide">
          <h3>Дохід по днях</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(0)} ₴`, 'Дохід']} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card analytics-card-wide">
          <h3>Бронювання по днях</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Бронювання" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Завантаженість по годинах</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Бронювання" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Бронювання за категоріями</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="bookings"
                nameKey="name"
                cx="50%" cy="45%"
                outerRadius={90}
                label={({ name, percent }) => {
                  const p = (percent ?? 0) * 100;
                  return p >= 3 ? `${name} ${p.toFixed(0)}%` : '';
                }}
                labelLine={false}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card analytics-card-wide">
          <h3>Попит на робочі місця</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, workspaces.length * 36)}>
            <BarChart data={workspaces} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" name="Бронювання" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Найпопулярніші послуги</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={services}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="usage_count" name="Замовлень" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>Дохід від послуг</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={services.filter(s => s.revenue > 0)}
                dataKey="revenue"
                nameKey="name"
                cx="50%" cy="45%"
                outerRadius={90}
                label={({ name, percent }) => {
                  const p = (percent ?? 0) * 100;
                  return p >= 3 ? `${name} ${p.toFixed(0)}%` : '';
                }}
                labelLine={false}
              >
                {services.filter(s => s.revenue > 0).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v).toFixed(0)} ₴`, 'Дохід']} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card analytics-card-wide">
          <h3>Найактивніші клієнти (топ-20)</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Клієнт</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>Бронювань</th>
                  <th>Витрачено</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.email}>
                    <td>{i + 1}</td>
                    <td>{c.full_name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>{c.bookings}</td>
                    <td>{c.total_spent.toFixed(0)} ₴</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
