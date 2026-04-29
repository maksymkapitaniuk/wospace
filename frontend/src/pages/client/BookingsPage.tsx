import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import type { Booking } from '../../types';

const WORK_START = 8;
const WORK_END = 20;
const HOURS = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#84cc16'];
const PER_PAGE = 10;

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

type ViewMode = 'calendar' | 'cards';

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('bookingsView') as ViewMode) || 'calendar');
  const [loading, setLoading] = useState(true);

  const [calendarBookings, setCalendarBookings] = useState<Booking[]>([]);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [tooltip, setTooltip] = useState<{ booking: Booking; x: number; y: number } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(50);
  const headerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setHeaderHeight(node.getBoundingClientRect().height);
  }, []);

  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('bookingsView', mode);
  };

  const fetchCalendar = (start: Date, end: Date) => {
    setLoading(true);
    api.get('/bookings', { params: { from: start.toISOString(), to: end.toISOString(), period: 'all', limit: '200' } })
      .then((r) => setCalendarBookings(r.data.data))
      .finally(() => setLoading(false));
  };

  const fetchUpcoming = (page: number) =>
    api.get('/bookings', { params: { period: 'upcoming', page, limit: PER_PAGE } }).then((r) => {
      setUpcoming(r.data.data);
      setUpcomingTotal(r.data.total);
    });

  const fetchPast = (page: number) =>
    api.get('/bookings', { params: { period: 'past', page, limit: PER_PAGE } }).then((r) => {
      setPast(r.data.data);
      setPastTotal(r.data.total);
    });

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendar(weekStart, weekEnd);
    } else {
      setLoading(true);
      Promise.all([fetchUpcoming(1), fetchPast(1)]).finally(() => setLoading(false));
      setUpcomingPage(1);
      setPastPage(1);
    }
  }, [viewMode, weekStart, weekEnd]);

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити бронювання?')) return;
    await api.delete(`/bookings/${id}`);
    if (viewMode === 'calendar') {
      fetchCalendar(weekStart, weekEnd);
    } else {
      fetchUpcoming(upcomingPage);
      fetchPast(pastPage);
    }
  };

  const changeUpcomingPage = (p: number) => { setUpcomingPage(p); fetchUpcoming(p); };
  const changePastPage = (p: number) => { setPastPage(p); fetchPast(p); };

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const thisWeek = () => setWeekStart(getMonday(new Date()));

  const workspaceColors = useMemo(() => {
    const map: Record<number, string> = {};
    let idx = 0;
    calendarBookings.forEach((b) => {
      if (!(b.workspace_id in map)) {
        map[b.workspace_id] = COLORS[idx % COLORS.length];
        idx++;
      }
    });
    return map;
  }, [calendarBookings]);

  const now = new Date();
  const upcomingPages = Math.ceil(upcomingTotal / PER_PAGE);
  const pastPages = Math.ceil(pastTotal / PER_PAGE);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Мої бронювання</h1>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchView('calendar')}>Календар</button>
            <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchView('cards')}>Картки</button>
          </div>
          <Link to="/bookings/new" className="btn btn-primary">Нове бронювання</Link>
        </div>
      </div>

      {viewMode === 'calendar' && (
        <>
          <div className="calendar-nav">
            <button className="btn btn-sm btn-outline" onClick={prevWeek}>← Попередній тиждень</button>
            <button className="btn btn-sm btn-outline" onClick={thisWeek}>Сьогодні</button>
            <span className="calendar-range">{formatDate(weekDays[0])} — {formatDate(weekDays[6])}</span>
            <button className="btn btn-sm btn-outline" onClick={nextWeek}>Наступний тиждень →</button>
          </div>

          {loading ? (
            <div className="loading">Завантаження...</div>
          ) : (
            <div className="calendar-wrapper" onClick={() => setTooltip(null)}>
              <div className="calendar-grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                <div className="calendar-corner" ref={headerRef} />
                {weekDays.map((d, i) => {
                  const isToday = toISODate(d) === toISODate(new Date());
                  return (
                    <div key={i} className={`calendar-day-header ${isToday ? 'calendar-today' : ''}`}>
                      <span className="calendar-day-name">{DAY_NAMES[d.getDay()]}</span>
                      <span className="calendar-day-date">{formatDate(d)}</span>
                    </div>
                  );
                })}

                {HOURS.map((hour) => (
                  <div key={hour} className="calendar-row" style={{ display: 'contents' }}>
                    <div className="calendar-hour">{hour.toString().padStart(2, '0')}:00</div>
                    {weekDays.map((_, di) => (
                      <div key={di} className="calendar-cell" />
                    ))}
                  </div>
                ))}
              </div>

              <div className="calendar-events">
                {calendarBookings.map((b) => {
                  const start = new Date(b.start_time);
                  const end = new Date(b.end_time);
                  const dayIdx = weekDays.findIndex((d) => toISODate(d) === toISODate(start));
                  if (dayIdx === -1) return null;

                  const startHour = start.getHours() + start.getMinutes() / 60;
                  const endHour = end.getHours() + end.getMinutes() / 60;
                  const top = (startHour - WORK_START) * 60;
                  const height = (endHour - startHour) * 60;
                  const left = `calc(60px + ${dayIdx} * ((100% - 60px) / 7))`;
                  const width = `calc((100% - 60px) / 7 - 4px)`;
                  const bg = workspaceColors[b.workspace_id] || '#3b82f6';
                  const isPast = start < now;

                  return (
                    <div
                      key={b.booking_id}
                      className="calendar-event"
                      style={{ top: `${headerHeight + top}px`, left, width, height: `${Math.max(height, 20)}px`, background: bg, opacity: isPast ? 0.5 : 0.9 }}
                      onClick={(e) => { e.stopPropagation(); setTooltip(tooltip?.booking.booking_id === b.booking_id ? null : { booking: b, x: e.clientX, y: e.clientY }); }}
                    >
                      <span className="calendar-event-title">{b.workspace.name}</span>
                      {height >= 40 && <span className="calendar-event-client">{b.workspace.category.name}</span>}
                    </div>
                  );
                })}
              </div>

              {tooltip && (
                <div className="calendar-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }} onClick={(e) => e.stopPropagation()}>
                  <strong>{tooltip.booking.workspace.name}</strong> ({tooltip.booking.workspace.category.name})
                  <br />{new Date(tooltip.booking.start_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} — {new Date(tooltip.booking.end_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  <br />Ціна: {tooltip.booking.total_price} грн
                  {tooltip.booking.bookingServices.length > 0 && (
                    <>
                      <br />Послуги: {tooltip.booking.bookingServices.map((bs) => `${bs.service.name} ×${bs.quantity}`).join(', ')}
                    </>
                  )}
                  {new Date(tooltip.booking.start_time) >= now && (
                    <div className="calendar-tooltip-actions">
                      <Link to={`/bookings/${tooltip.booking.booking_id}/edit`} className="btn btn-sm btn-outline">Редагувати</Link>
                      <button onClick={() => { handleDelete(tooltip.booking.booking_id); setTooltip(null); }} className="btn btn-sm btn-danger">Видалити</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'cards' && (
        <>
          {loading ? (
            <div className="loading">Завантаження...</div>
          ) : (
            <>
              <h2>Поточні ({upcomingTotal})</h2>
              {upcoming.length === 0 ? (
                <p className="empty">У вас поки немає поточних бронювань</p>
              ) : (
                <>
                  <div className="cards">
                    {upcoming.map((b) => (
                      <div key={b.booking_id} className="card">
                        <div className="card-header">
                          <h3>{b.workspace.name}</h3>
                          <span className="badge">{b.workspace.category.name}</span>
                        </div>
                        <div className="card-body">
                          <p><strong>Початок:</strong> {new Date(b.start_time).toLocaleString('uk-UA')}</p>
                          <p><strong>Кінець:</strong> {new Date(b.end_time).toLocaleString('uk-UA')}</p>
                          <p><strong>Ціна:</strong> {b.total_price} грн</p>
                          {b.bookingServices.length > 0 && (
                            <div className="services-list">
                              <strong>Послуги:</strong>
                              {b.bookingServices.map((bs) => (
                                <span key={bs.service_id} className="service-tag">{bs.service.name} ×{bs.quantity}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="card-actions">
                          <Link to={`/bookings/${b.booking_id}/edit`} className="btn btn-sm btn-outline">Редагувати</Link>
                          <button onClick={() => handleDelete(b.booking_id)} className="btn btn-sm btn-danger">Видалити</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {upcomingPages > 1 && (
                    <div className="pagination">
                      <button className="btn btn-sm btn-outline" disabled={upcomingPage <= 1} onClick={() => changeUpcomingPage(upcomingPage - 1)}>← Назад</button>
                      <span className="pagination-info">Сторінка {upcomingPage} з {upcomingPages}</span>
                      <button className="btn btn-sm btn-outline" disabled={upcomingPage >= upcomingPages} onClick={() => changeUpcomingPage(upcomingPage + 1)}>Вперед →</button>
                    </div>
                  )}
                </>
              )}

              <h2 style={{ marginTop: '2rem' }}>Минулі ({pastTotal})</h2>
              {past.length === 0 ? (
                <p className="empty">Немає минулих бронювань</p>
              ) : (
                <>
                  <div className="cards">
                    {past.map((b) => (
                      <div key={b.booking_id} className="card" style={{ opacity: 0.7 }}>
                        <div className="card-header">
                          <h3>{b.workspace.name}</h3>
                          <span className="badge">{b.workspace.category.name}</span>
                        </div>
                        <div className="card-body">
                          <p><strong>Початок:</strong> {new Date(b.start_time).toLocaleString('uk-UA')}</p>
                          <p><strong>Кінець:</strong> {new Date(b.end_time).toLocaleString('uk-UA')}</p>
                          <p><strong>Ціна:</strong> {b.total_price} грн</p>
                          {b.bookingServices.length > 0 && (
                            <div className="services-list">
                              <strong>Послуги:</strong>
                              {b.bookingServices.map((bs) => (
                                <span key={bs.service_id} className="service-tag">{bs.service.name} ×{bs.quantity}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {pastPages > 1 && (
                    <div className="pagination">
                      <button className="btn btn-sm btn-outline" disabled={pastPage <= 1} onClick={() => changePastPage(pastPage - 1)}>← Назад</button>
                      <span className="pagination-info">Сторінка {pastPage} з {pastPages}</span>
                      <button className="btn btn-sm btn-outline" disabled={pastPage >= pastPages} onClick={() => changePastPage(pastPage + 1)}>Вперед →</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
