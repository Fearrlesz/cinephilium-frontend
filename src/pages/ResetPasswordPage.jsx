import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import './LoginPage.css';

const PASSWORD_MIN = 8;

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN) {
      setError(`Пароль должен содержать минимум ${PASSWORD_MIN} символов`);
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось изменить пароль'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container auth-container">
        <div className="auth-box glass-card">
          <h1>Сброс пароля</h1>
          <div className="error-msg">Ссылка недействительна: в ней нет токена.</div>
          <p className="toggle-auth">
            <Link to="/forgot-password">Запросить новую ссылку</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>Новый пароль</h1>

        {error && <div className="error-msg">{error}</div>}

        {done ? (
          <>
            <div className="success-msg">Пароль изменён. Теперь можно войти.</div>
            <p className="toggle-auth">
              <Link to="/login">Перейти ко входу</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Новый пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              required
            />
            <input
              type="password"
              placeholder="Повторите пароль"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Сохраняем...' : 'Изменить пароль'}
            </button>
          </form>
        )}

        {!done && (
          <p className="toggle-auth">
            <Link to="/login">Вернуться ко входу</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
