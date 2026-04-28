import { useEffect, useState } from 'react';
import api from '../../api';

interface Manager {
  manager_id: number;
  full_name: string;
  email: string;
  phone: string;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/admin/managers');
    setManagers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/managers', form);
      setForm({ name: '', surname: '', email: '', phone: '', password: '', confirmPassword: '' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка';
      setError(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити менеджера?')) return;
    await api.delete(`/admin/managers/${id}`);
    load();
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Менеджери</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Скасувати' : 'Додати менеджера'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form form-inline">
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <label>Імʼя <input name="name" value={form.name} onChange={handleChange} required /></label>
            <label>Прізвище <input name="surname" value={form.surname} onChange={handleChange} required /></label>
          </div>
          <div className="form-row">
            <label>Email <input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
            <label>Телефон <input name="phone" value={form.phone} onChange={handleChange} required /></label>
          </div>
          <div className="form-row">
            <label>Пароль <input name="password" type="password" value={form.password} onChange={handleChange} required /></label>
            <label>Підтвердження <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required /></label>
          </div>
          <button type="submit" className="btn btn-primary">Створити</button>
        </form>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Імʼя</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m.manager_id}>
                <td>{m.manager_id}</td>
                <td>{m.full_name}</td>
                <td>{m.email}</td>
                <td>{m.phone}</td>
                <td>
                  <button onClick={() => handleDelete(m.manager_id)} className="btn btn-sm btn-danger">Видалити</button>
                </td>
              </tr>
            ))}
            {managers.length === 0 && (
              <tr><td colSpan={5} className="empty">Менеджерів не знайдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
