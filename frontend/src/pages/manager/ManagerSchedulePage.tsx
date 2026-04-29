import { useEffect, useState, useMemo } from 'react';
import api from '../../api';
import type { Booking, Workspace } from '../../types';

const WORK_START = 8;
const WORK_END = 20;
const HOURS = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#84cc16'];

function toISODate(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatDateUA(d: Date) {
  const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота'];
  return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

export default function ManagerSchedulePage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ booking: Booking; x: number; y: number } | null>(null);

  useEffect(() => {
    api.get('/workspaces').then((r) => setWorkspaces(r.data));
  }, []);

  useEffect(() => {
    const from = new Date(date);
    const to = new Date(date);
    to.setDate(to.getDate() + 1);
    setLoading(true);
    api.get('/bookings', { params: { from: from.toISOString(), to: to.toISOString(), period: 'all', limit: '500' } })
      .then((r) => setBookings(r.data.data))
      .finally(() => setLoading(false));
  }, [date]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d); };

  const isToday = toISODate(date) === toISODate(new Date());

  const wsColors = useMemo(() => {
    const map: Record<number, string> = {};
    workspaces.forEach((ws, i) => {
      map[ws.workspace_id] = COLORS[i % COLORS.length];
    });
    return map;
  }, [workspaces]);

  const cols = workspaces.length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Завантаженість</h1>
      </div>

      <div className="calendar-nav">
        <button className="btn btn-sm btn-outline" onClick={prevDay}>← Попередній день</button>
        <button className="btn btn-sm btn-outline" onClick={today}>Сьогодні</button>
        <span className="calendar-range">{formatDateUA(date)}</span>
        <button className="btn btn-sm btn-outline" onClick={nextDay}>Наступний день →</button>
      </div>

      {loading ? (
        <div className="loading">Завантаження...</div>
      ) : (
        <div className="schedule-wrapper">
          <div className="schedule-grid" style={{ gridTemplateColumns: `60px repeat(${cols}, minmax(90px, 1fr))` }}>
            <div className="calendar-corner" />
            {workspaces.map((ws) => (
              <div key={ws.workspace_id} className="calendar-day-header">
                <span className="calendar-day-name">{ws.name}</span>
                <span className="calendar-day-date">{ws.category.name}</span>
              </div>
            ))}

            {HOURS.map((hour) => (
              <div key={hour} style={{ display: 'contents' }}>
                <div className="calendar-hour">{hour.toString().padStart(2, '0')}:00</div>
                {workspaces.map((ws) => {
                  const cellBookings = bookings.filter(
                    (b) => b.workspace_id === ws.workspace_id &&
                      new Date(b.start_time).getHours() <= hour &&
                      new Date(b.end_time).getHours() > hour
                  );
                  const isCurrent = isToday && new Date().getHours() === hour;
                  return (
                    <div key={ws.workspace_id} className={`schedule-cell ${isCurrent ? 'schedule-current-hour' : ''}`}>
                      {cellBookings.map((b) => {
                        const start = new Date(b.start_time);
                        const end = new Date(b.end_time);
                        const startHour = start.getHours() + start.getMinutes() / 60;
                        const isFirst = Math.floor(startHour) === hour;
                        if (!isFirst) return null;
                        const endHour = end.getHours() + end.getMinutes() / 60;
                        const duration = endHour - startHour;
                        const height = duration * 60;
                        const bg = wsColors[b.workspace_id] || '#3b82f6';
                        const isPast = end < new Date();
                        return (
                          <div
                            key={b.booking_id}
                            className="schedule-block"
                            style={{ height: `${height}px`, background: bg, opacity: isPast ? 0.5 : 0.9 }}
                            onMouseEnter={(e) => setTooltip({ booking: b, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="calendar-event-title">
                              {start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}–{end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {height >= 40 && <span className="calendar-event-client">{b.client?.full_name}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {tooltip && (
            <div className="calendar-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
              <strong>{tooltip.booking.workspace.name}</strong> ({tooltip.booking.workspace.category.name})
              <br />Клієнт: {tooltip.booking.client?.full_name}
              <br />Email: {tooltip.booking.client?.email}
              <br />{new Date(tooltip.booking.start_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} — {new Date(tooltip.booking.end_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
              <br />Ціна: {tooltip.booking.total_price} грн
              {tooltip.booking.bookingServices.length > 0 && (
                <>
                  <br />Послуги: {tooltip.booking.bookingServices.map((bs) => `${bs.service.name} ×${bs.quantity}`).join(', ')}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
