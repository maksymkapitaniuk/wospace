import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import type { Booking } from '../../types';

const PER_PAGE = 15;

export default function ManagerBookingsPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [loading, setLoading] = useState(true);

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
    const load = () => {
      setLoading(true);
      Promise.all([fetchUpcoming(1), fetchPast(1)]).finally(() => setLoading(false));
    };
    load();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити бронювання?')) return;
    await api.delete(`/bookings/${id}`);
    fetchUpcoming(upcomingPage);
    fetchPast(pastPage);
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
