import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import type { Booking, SpaceCategory, Service } from '../../types';

const PER_PAGE = 15;

interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  category_id: string;
  service_ids: number[];
}

const emptyFilters: Filters = { search: '', dateFrom: '', dateTo: '', priceMin: '', priceMax: '', category_id: '', service_ids: [] };

export default function ManagerBookingsPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/services')]).then(([c, s]) => {
      setCategories(c.data);
      setServices(s.data);
    });
  }, []);

  const buildParams = useCallback((period: string, page: number) => {
    const p: Record<string, string | string[]> = { period, page: String(page), limit: String(PER_PAGE) };
    if (applied.search) p.search = applied.search;
    if (applied.dateFrom && applied.dateTo) { p.from = new Date(applied.dateFrom).toISOString(); p.to = new Date(applied.dateTo + 'T23:59:59').toISOString(); }
    if (applied.priceMin) p.price_min = applied.priceMin;
    if (applied.priceMax) p.price_max = applied.priceMax;
    if (applied.category_id) p.category_id = applied.category_id;
    if (applied.service_ids.length > 0) p.service_id = applied.service_ids.join(',');
    return p;
  }, [applied]);

  const fetchUpcoming = useCallback((page: number) =>
    api.get('/bookings', { params: buildParams('upcoming', page) }).then((r) => {
      setUpcoming(r.data.data);
      setUpcomingTotal(r.data.total);
    }), [buildParams]);

  const fetchPast = useCallback((page: number) =>
    api.get('/bookings', { params: buildParams('past', page) }).then((r) => {
      setPast(r.data.data);
      setPastTotal(r.data.total);
    }), [buildParams]);

  useEffect(() => {
    setLoading(true);
    setUpcomingPage(1);
    setPastPage(1);
    Promise.all([fetchUpcoming(1), fetchPast(1)]).finally(() => setLoading(false));
  }, [fetchUpcoming, fetchPast]);

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити бронювання?')) return;
    await api.delete(`/bookings/${id}`);
    fetchUpcoming(upcomingPage);
    fetchPast(pastPage);
  };

  const applyFilters = () => { setApplied({ ...filters }); };
  const resetFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters); };

  const toggleServiceFilter = (sid: number) => {
    setFilters((f) => ({
      ...f,
      service_ids: f.service_ids.includes(sid) ? f.service_ids.filter((x) => x !== sid) : [...f.service_ids, sid],
    }));
  };

  const changeUpcomingPage = (p: number) => { setUpcomingPage(p); fetchUpcoming(p); };
  const changePastPage = (p: number) => { setPastPage(p); fetchPast(p); };

  const upcomingPages = Math.ceil(upcomingTotal / PER_PAGE);
  const pastPages = Math.ceil(pastTotal / PER_PAGE);

  const renderTable = (bookings: Booking[], showActions: boolean) => (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Клієнт</th>
            <th>Робоче місце</th>
            <th>Категорія</th>
            <th>Початок</th>
            <th>Кінець</th>
            <th>Ціна</th>
            <th>Послуги</th>
            {showActions && <th>Дії</th>}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.client?.email ?? '—'}</td>
              <td>{b.client?.full_name ?? '—'}</td>
              <td>{b.workspace.name}</td>
              <td>{b.workspace.category.name}</td>
              <td>{new Date(b.start_time).toLocaleString('uk-UA')}</td>
              <td>{new Date(b.end_time).toLocaleString('uk-UA')}</td>
              <td>{b.total_price} грн</td>
              <td>
                {b.bookingServices.length > 0
                  ? b.bookingServices.map((bs) => `${bs.service.name} ×${bs.quantity}`).join(', ')
                  : '—'}
              </td>
              {showActions && (
                <td>
                  <div className="actions">
                    <Link to={`/manager/bookings/${b.booking_id}/edit`} className="btn btn-sm btn-outline">Ред.</Link>
                    <button onClick={() => handleDelete(b.booking_id)} className="btn btn-sm btn-danger">Вид.</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Бронювання</h1>
        <Link to="/manager/bookings/new" className="btn btn-primary">Нове бронювання</Link>
      </div>

      <div className="filters-panel">
        <div className="filters-row">
          <label className="filter-field">
            <span>Пошук (email / телефон / імʼя)</span>
            <input type="text" placeholder="Введіть..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </label>
          <label className="filter-field">
            <span>Категорія</span>
            <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
              <option value="">Усі</option>
              {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div className="filters-row">
          <label className="filter-field">
            <span>Дата від</span>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          </label>
          <label className="filter-field">
            <span>Дата до</span>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </label>
          <label className="filter-field">
            <span>Ціна від</span>
            <input type="number" min={0} placeholder="0" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} />
          </label>
          <label className="filter-field">
            <span>Ціна до</span>
            <input type="number" min={0} placeholder="∞" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} />
          </label>
        </div>
        {services.length > 0 && (
          <div className="filters-row">
            <div className="filter-field filter-services">
              <span>Послуги</span>
              <div className="filter-chips">
                {services.map((s) => (
                  <label key={s.service_id} className={`filter-chip ${filters.service_ids.includes(s.service_id) ? 'active' : ''}`}>
                    <input type="checkbox" checked={filters.service_ids.includes(s.service_id)} onChange={() => toggleServiceFilter(s.service_id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="filters-actions">
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>Застосувати</button>
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Скинути</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Завантаження...</div>
      ) : (
        <>
          <h2>Поточні ({upcomingTotal})</h2>
          {upcoming.length === 0 ? (
            <p className="empty">Немає поточних бронювань</p>
          ) : (
            <>
              {renderTable(upcoming, true)}
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
              {renderTable(past, false)}
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
    </div>
  );
}
