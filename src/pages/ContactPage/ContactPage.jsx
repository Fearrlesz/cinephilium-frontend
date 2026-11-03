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
    <main className="container contact-page">
      <header className="contact-head">
        <p className="contact-kicker">Доступ</p>
        <h1 className="contact-title">Связь с админами</h1>
        <p className="contact-lead">
          Доступ в Синефилиум — по приглашению. Напиши админу в Telegram или оставь
          заявку: ответим по указанному контакту.
        </p>
      </header>

      <div className="contact-grid">
        <aside className="contact-side" aria-label="Контакты админов">
          <p className="contact-side-title">Написать напрямую</p>

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
                <span className="contact-admin-avatar" aria-hidden="true">
                  {admin.nickname ? admin.nickname[0].toUpperCase() : '?'}
                </span>
                <span className="contact-admin-text">
                  <strong>{admin.nickname || 'Администратор'}</strong>
                  <span>@{admin.telegram}</span>
                </span>
              </a>
            ))
          )}

          <p className="contact-note">
            Уже есть инвайт-код? <Link to="/login">Войти или зарегистрироваться</Link>
          </p>
        </aside>

        <section className="contact-panel" aria-labelledby="contact-request-title">
          <h2 id="contact-request-title" className="contact-panel-title">Заявка на доступ</h2>

          {sent ? (
            <div className="contact-success">
              <p className="contact-success-title">Заявка отправлена</p>
              <p className="contact-hint">
                Админ свяжется с тобой по контакту. Хочешь ускорить — напиши в Telegram
                напрямую.
              </p>
              <Link to="/login" className="contact-back">Вернуться ко входу</Link>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              {error && <p className="contact-error" role="alert">{error}</p>}

              <label className="contact-field">
                <span>Желаемый никнейм</span>
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

              <label className="contact-field">
                <span>Как с тобой связаться</span>
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

              <label className="contact-field">
                <span>Пара слов о себе <em>(необязательно)</em></span>
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

              <button type="submit" className="contact-submit" disabled={loading}>
                {loading ? 'Отправляем…' : 'Отправить заявку'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default ContactPage;
