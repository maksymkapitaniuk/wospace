import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import type { Booking } from '../../types';

const PER_PAGE = 10;

function BookingsTable({ bookings, onDelete, prefix }: { bookings: Booking[]; onDelete?: (id: number) => void; prefix: string }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Клієнт</th>
            <th>Місце</th>
            <th>Категорія</th>
            <th>Початок</th>
            <th>Кінець</th>
            <th>Ціна</th>
            {onDelete && <th>Дії</th>}
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.booking_id}</td>
              <td>{b.client?.full_name}</td>
              <td>{b.workspace.name}</td>
              <td>{b.workspace.category.name}</td>
              <td>{new Date(b.start_time).toLocaleString('uk-UA')}</td>
              <td>{new Date(b.end_time).toLocaleString('uk-UA')}</td>
              <td>{b.total_price} грн</td>
              {onDelete && (
                <td className="actions">
                  <Link to={`${prefix}/${b.booking_id}/edit`} className="btn btn-sm btn-outline">Ред.</Link>
                  <button onClick={() => onDelete(b.booking_id)} className="btn btn-sm btn-danger">Вид.</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Назад</button>
      <span className="pagination-info">Сторінка {page} з {totalPages}</span>
      <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Вперед →</button>
    </div>
  );
}

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
    Promise.all([fetchUpcoming(1), fetchPast(1)]).finally(() => setLoading(false));
  }, []);

  const changeUpcomingPage = (p: number) => { setUpcomingPage(p); fetchUpcoming(p); };
  const changePastPage = (p: number) => { setPastPage(p); fetchPast(p); };

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити бронювання?')) return;
    await api.delete(`/bookings/${id}`);
    fetchUpcoming(upcomingPage);
    fetchPast(pastPage);
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Усі бронювання</h1>
        <Link to="/manager/bookings/new" className="btn btn-primary">Нове бронювання</Link>
      </div>

      <h2>Майбутні ({upcomingTotal})</h2>
      {upcoming.length === 0 ? (
        <p className="empty">Немає майбутніх бронювань</p>
      ) : (
        <>
          <BookingsTable bookings={upcoming} onDelete={handleDelete} prefix="/manager/bookings" />
          <Pagination page={upcomingPage} totalPages={Math.ceil(upcomingTotal / PER_PAGE)} onChange={changeUpcomingPage} />
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Минулі ({pastTotal})</h2>
      {past.length === 0 ? (
        <p className="empty">Немає минулих бронювань</p>
      ) : (
        <>
          <BookingsTable bookings={past} prefix="/manager/bookings" />
          <Pagination page={pastPage} totalPages={Math.ceil(pastTotal / PER_PAGE)} onChange={changePastPage} />
        </>
      )}
    </div>
  );
}
