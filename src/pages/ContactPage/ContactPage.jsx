import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';
import './ContactPage.css';

// Страница «Связь с админами»: живые контакты + заявка на доступ.
function ContactPage() {
  const [admins, setAdmins] = useState([]);
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // ловушка для ботов, человек её не видит
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/contact/admins')
      .then(response => {
        if (!cancelled) setAdmins(response.data?.admins || []);
      })
      .catch(() => {
        if (!cancelled) setAdmins([]);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (nickname.trim().length < 2) {
      setError('Никнейм должен быть от 2 символов');
      return;
    }
    if (contact.trim().length < 3) {
      setError('Укажи контакт: телеграм, почту или ссылку');
      return;
    }

    setLoading(true);
    try {
      await api.post('/contact/request', {
        nickname: nickname.trim(),
        contact: contact.trim(),
        message: message.trim(),
        website
      });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось отправить заявку'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container contact-page">
      <div className="contact-card glass-card">
        <h1>Связь с админами</h1>
        <p className="contact-lead">
          Доступ в Синефилиум — по приглашению. Оставь заявку или напиши админу в Telegram:
          ответим по указанному контакту.
        </p>

        <div className="contact-admins">
          {admins.length === 0 ? (
            <p className="contact-hint">Контакты загружаются…</p>
          ) : (
            admins.map(admin => (
              <a
                key={admin.telegram}
                className="contact-admin"
                href={`https://t.me/${admin.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-admin-avatar">{admin.nickname ? admin.nickname[0] : ''}</span>
                <span className="contact-admin-text">
                  <strong>{admin.nickname || 'Администратор'}</strong>
                  <span>@{admin.telegram}</span>
                </span>
              </a>
            ))
          )}
        </div>

        <h2 id="request">Заявка на доступ</h2>

        {sent ? (
          <div className="contact-success">
            <div className="success-msg">Заявка отправлена. Админ свяжется с тобой по контакту.</div>
            <p className="contact-hint">
              Хочешь ускорить — напиши напрямую в Telegram, ссылки выше.
            </p>
            <Link to="/login" className="contact-back">Вернуться ко входу</Link>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <label className="contact-label">
              Желаемый никнейм
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Как тебя звать на сайте"
                maxLength={50}
                required
                minLength={2}
              />
            </label>

            <label className="contact-label">
              Как с тобой связаться
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@telegram, почта или ссылка"
                maxLength={120}
                required
                minLength={3}
              />
            </label>

            <label className="contact-label">
              Пара слов о себе <span className="contact-optional">(необязательно)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Что смотришь, зачем тебе аккаунт"
                maxLength={500}
                rows={4}
              />
            </label>

            {/* Ловушка для ботов: невидима и недоступна с клавиатуры */}
            <input
              className="contact-trap"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Отправляем…' : 'Отправить заявку'}
            </button>
          </form>
        )}

        <p className="contact-hint">
          Уже есть инвайт-код? <Link to="/login">Войти или зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}

export default ContactPage;
