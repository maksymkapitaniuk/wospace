import { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/users/profile').then(({ data }) => {
      setForm({ full_name: data.full_name, email: data.email, phone: data.phone });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put('/users/profile', form);
      setForm({ full_name: data.full_name, email: data.email, phone: data.phone });
      setEditing(false);
      setSuccess('Профіль оновлено');
      if (user) {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const updated = { ...parsed, full_name: data.full_name, email: data.email, phone: data.phone };
          localStorage.setItem('user', JSON.stringify(updated));
          window.location.reload();
        }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка';
      setError(msg);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    if (user) {
      setForm({ full_name: user.full_name, email: user.email, phone: user.phone });
    }
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Мій профіль</h1>
        {!editing && (
          <button className="btn btn-primary" onClick={() => { setEditing(true); setSuccess(''); }}>Редагувати</button>
        )}
      </div>

      {success && <div className="success-msg">{success}</div>}
      {error && <div className="error-msg">{error}</div>}

      {editing ? (
        <form onSubmit={handleSave} className="form">
          <label>
            Повне імʼя
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Телефон
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Зберегти</button>
            <button type="button" className="btn btn-outline" onClick={handleCancel}>Скасувати</button>
          </div>
        </form>
      ) : (
        <div className="profile-info">
          <div className="profile-row">
            <span className="profile-label">Повне імʼя:</span>
            <span>{form.full_name}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Email:</span>
            <span>{form.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Телефон:</span>
            <span>{form.phone}</span>
          </div>
        </div>
      )}
    </div>
  );
}
