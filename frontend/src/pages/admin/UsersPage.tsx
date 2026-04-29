import { useEffect, useState } from 'react';
import api from '../../api';

interface ClientUser {
  client_id: number;
  full_name: string;
  email: string;
  phone: string;
}

type SortField = 'full_name' | 'email';
type SortDir = 'asc' | 'desc';
const PER_PAGE = 15;

export default function UsersPage() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const load = async (p: number, q: string, sb: SortField, sd: SortDir) => {
    try {
      const params: Record<string, string> = { page: String(p), limit: String(PER_PAGE), sort_by: sb, sort_dir: sd };
      if (q) params.search = q;
      const { data } = await api.get('/users', { params });
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, appliedSearch, sortBy, sortDir); }, [page, appliedSearch, sortBy, sortDir]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const resetSearch = () => {
    setSearch('');
    setPage(1);
    setAppliedSearch('');
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIcon = (field: SortField) => {
    if (sortBy !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const startEdit = (u: ClientUser) => {
    setEditing(u.client_id);
    setEditName(u.full_name);
    setError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
  };

  const saveEdit = async (id: number) => {
    setError('');
    try {
      await api.put(`/users/${id}`, { full_name: editName });
      setEditing(null);
      load(page, appliedSearch, sortBy, sortDir);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка';
      setError(msg);
    }
  };

  const handleDelete = async (u: ClientUser) => {
    if (!confirm(`Видалити користувача "${u.full_name}"?`)) return;
    setError('');
    try {
      await api.delete(`/users/${u.client_id}`);
      load(page, appliedSearch, sortBy, sortDir);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка';
      setError(msg);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', surname: '', email: '', phone: '', password: '', confirmPassword: '' });
      setShowForm(false);
      setPage(1);
      load(1, appliedSearch, sortBy, sortDir);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка';
      setError(msg);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Користувачі</h1>
        <button onClick={() => { setShowForm(!showForm); setError(''); }} className="btn btn-primary">
          {showForm ? 'Скасувати' : 'Додати користувача'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="form form-inline">
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <label>Імʼя <input name="name" value={form.name} onChange={handleFormChange} required /></label>
            <label>Прізвище <input name="surname" value={form.surname} onChange={handleFormChange} required /></label>
          </div>
          <div className="form-row">
            <label>Email <input name="email" type="email" value={form.email} onChange={handleFormChange} required /></label>
            <label>Телефон <input name="phone" value={form.phone} onChange={handleFormChange} required /></label>
          </div>
          <div className="form-row">
            <label>Пароль <input name="password" type="password" value={form.password} onChange={handleFormChange} required /></label>
            <label>Підтвердження <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleFormChange} required /></label>
          </div>
          <button type="submit" className="btn btn-primary">Створити</button>
        </form>
      )}

      <form onSubmit={handleSearch} className="filters" style={{ marginBottom: '1rem', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Пошук за іменем, email або телефоном..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '300px', marginRight: '0.5rem' }}
        />
        <button type="submit" className="btn btn-primary btn-sm">Знайти</button>
        {appliedSearch && (
          <button type="button" className="btn btn-outline btn-sm" onClick={resetSearch}>Скинути</button>
        )}
      </form>

      {!showForm && error && <div className="error-msg">{error}</div>}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th className="sortable-th" onClick={() => toggleSort('full_name')}>Імʼя{sortIcon('full_name')}</th>
              <th className="sortable-th" onClick={() => toggleSort('email')}>Email{sortIcon('email')}</th>
              <th>Телефон</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Користувачів не знайдено</td></tr>
            ) : users.map((u) => (
              <tr key={u.client_id}>
                <td>{u.client_id}</td>
                <td>
                  {editing === u.client_id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : u.full_name}
                </td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>
                  {editing === u.client_id ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(u.client_id)}>Зберегти</button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Скасувати</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => startEdit(u)}>Редагувати</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Видалити</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Назад</button>
          <span className="pagination-info">Сторінка {page} з {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Далі →</button>
        </div>
      )}
    </div>
  );
}
