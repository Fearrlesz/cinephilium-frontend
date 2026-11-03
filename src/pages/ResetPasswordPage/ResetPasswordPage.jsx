import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';

const PASSWORD_MIN = 8;

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      <div className="auth-box auth-document">
        <p className="auth-kicker">Доступ</p>
        <h1 className="auth-title">Сброс пароля</h1>
        <div className="auth-error">Ссылка недействительна: в ней нет токена.</div>
        <div className="auth-links">
          <p><Link to="/forgot-password">Как получить ссылку</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-box auth-document">
      <p className="auth-kicker">Доступ</p>
      <h1 className="auth-title">Новый пароль</h1>
      <p className="auth-subtitle">Задайте пароль — после этого все старые сессии закроются.</p>

      {error && <div className="auth-error">{error}</div>}

      {done ? (
        <>
          <div className="auth-success">Пароль изменён. Теперь можно войти.</div>
          <div className="auth-links">
            <p><Link to="/login">Перейти ко входу</Link></p>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Новый пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              required
            />
          </label>
          <label className="auth-field">
            <span>Повторите пароль</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              required
            />
          </label>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Сохраняем…' : 'Изменить пароль'}
          </button>
        </form>
      )}

      {!done && (
        <div className="auth-links">
          <p><Link to="/login">Вернуться ко входу</Link></p>
        </div>
      )}
    </div>
  );
}

export default ResetPasswordPage;
