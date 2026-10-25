import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import './AdminPanel.css';

const INVITE_STATUS_LABELS = {
  active: 'свободен',
  used: 'использован',
  expired: 'истёк',
  revoked: 'отозван'
};

function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingComments, setPendingComments] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteQuantity, setInviteQuantity] = useState(1);
  const [inviteNote, setInviteNote] = useState('');
  const [freshCodes, setFreshCodes] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [resetLink, setResetLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [navigate]);

  const loadAdminData = async () => {
    try {
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      if (!userResponse.data.isAdmin) {
        navigate('/');
        return;
      }
      const [commentsRes, reviewsRes, invitesRes] = await Promise.all([
        api.get('/admin/pending/comments'),
        api.get('/admin/pending/reviews'),
        api.get('/admin/invites')
      ]);
      setPendingComments(commentsRes.data || []);
      setPendingReviews(reviewsRes.data || []);
      setInvites(invitesRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки админ-панели:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const approveComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/approve`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
      showNotification({ title: 'Одобрено', message: 'Комментарий опубликован', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить комментарий', type: 'error' });
    }
  };

  const rejectComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/reject`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
      showNotification({ title: 'Отклонено', message: 'Комментарий отклонён', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить комментарий', type: 'error' });
    }
  };

  const approveReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Одобрено', message: 'Рецензия опубликована', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить рецензию', type: 'error' });
    }
  };

  const rejectReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/reject`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Отклонено', message: 'Рецензия отклонена', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить рецензию', type: 'error' });
    }
  };

  const createInvites = async () => {
    try {
      const response = await api.post('/admin/invites', {
        quantity: Number(inviteQuantity) || 1,
        note: inviteNote.trim() || undefined
      });
      setFreshCodes(response.data?.invites || []);
      setInviteNote('');
      const list = await api.get('/admin/invites');
      setInvites(list.data || []);
      showNotification({ title: 'Коды созданы', message: 'Скопируй их: в списке они больше не появятся', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось создать коды', type: 'error' });
    }
  };

  const revokeInvite = async (id) => {
    try {
      await api.delete(`/admin/invites/${id}`);
      setInvites(prev => prev.map(invite => (invite.id === id ? { ...invite, status: 'revoked' } : invite)));
      showNotification({ title: 'Код отозван', message: 'Зарегистрироваться по нему больше нельзя', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отозвать код', type: 'error' });
    }
  };

  const searchUsers = async () => {
    try {
      const response = await api.get('/admin/users', { params: { query: userQuery.trim() } });
      setFoundUsers(response.data || []);
      if ((response.data || []).length === 0) {
        showNotification({ title: 'Никого не нашли', message: 'Проверь никнейм', type: 'info' });
      }
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось выполнить поиск', type: 'error' });
    }
  };

  const issueResetLink = async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/reset-link`);
      setResetLink(response.data);
      showNotification({ title: 'Ссылка готова', message: 'Передай её пользователю', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось создать ссылку', type: 'error' });
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification({ title: 'Скопировано', message: label, type: 'success' });
    } catch {
      showNotification({ title: 'Не вышло скопировать', message: 'Выдели текст вручную', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="container admin-panel">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      <h1 className="admin-title">🛡️ Админ-панель</h1>
      <p className="admin-welcome">Добро пожаловать, {user?.nickname}!</p>

      <div className="admin-section glass-card">
        <h2>🎟️ Инвайт-коды</h2>
        <p className="admin-hint">
          Один код — один аккаунт. Коды показываются один раз, в списке остаётся только префикс.
        </p>

        <div className="admin-form-row">
          <input
            type="number"
            min="1"
            max="50"
            value={inviteQuantity}
            onChange={(e) => setInviteQuantity(e.target.value)}
            aria-label="Сколько кодов выдать"
          />
          <input
            type="text"
            placeholder="Заметка (для себя)"
            value={inviteNote}
            onChange={(e) => setInviteNote(e.target.value)}
            maxLength={200}
          />
          <button className="btn-approve" onClick={createInvites}>Выдать коды</button>
        </div>

        {freshCodes.length > 0 && (
          <div className="admin-fresh">
            <p>Сохрани коды сейчас — потом их не показать:</p>
            <div className="admin-codes">
              {freshCodes.map(item => (
                <code key={item.code}>{item.code}</code>
              ))}
            </div>
            <button
              className="btn-approve"
              onClick={() => copyText(freshCodes.map(item => item.code).join('\n'), 'Все коды в буфере')}
            >
              Скопировать все
            </button>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="admin-empty">Кодов пока нет</p>
        ) : (
          <div className="admin-list">
            {invites.map(invite => (
              <div key={invite.id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-code">{invite.prefix}-••••</span>
                  <span className={`invite-status invite-${invite.status}`}>
                    {INVITE_STATUS_LABELS[invite.status] || invite.status}
                  </span>
                </div>
                {invite.note && <p className="admin-item-text">{invite.note}</p>}
                {invite.usedBy && <p className="admin-item-text">Выдал доступ: {invite.usedBy}</p>}
                <div className="admin-item-actions">
                  {invite.status === 'active' && (
                    <button className="btn-reject" onClick={() => revokeInvite(invite.id)}>Отозвать</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section glass-card">
        <h2>🔑 Сброс пароля</h2>
        <p className="admin-hint">
          Письма сайт не отправляет: ссылку нужно передать пользователю самому.
        </p>

        <div className="admin-form-row">
          <input
            type="text"
            placeholder="Никнейм пользователя"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
          />
          <button className="btn-approve" onClick={searchUsers}>Найти</button>
        </div>

        {foundUsers.map(found => (
          <div key={found.id} className="admin-item">
            <div className="admin-item-header">
              <span className="admin-item-author">👤 {found.nickname}{found.isAdmin ? ' 👑' : ''}</span>
            </div>
            <div className="admin-item-actions">
              <button className="btn-approve" onClick={() => issueResetLink(found.id)}>
                Выдать ссылку
              </button>
            </div>
          </div>
        ))}

        {resetLink && (
          <div className="admin-fresh">
            <p>
              Ссылка для {resetLink.nickname}, действует до{' '}
              {new Date(resetLink.expiresAt).toLocaleString('ru-RU')}:
            </p>
            <code className="admin-reset-link">{resetLink.url}</code>
            <button className="btn-approve" onClick={() => copyText(resetLink.url, 'Ссылка в буфере')}>
              Скопировать ссылку
            </button>
          </div>
        )}
      </div>

      <div className="admin-section glass-card">
        <h2>💬 Комментарии на модерации ({pendingComments.length})</h2>
        {pendingComments.length === 0 ? (
          <p className="admin-empty">Нет комментариев для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingComments.map(c => (
              <div key={c._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {c.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {c.filmId?.title || 'Фильм'}</span>
                </div>
                <p className="admin-item-text">{c.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveComment(c._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectComment(c._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section glass-card">
        <h2>📝 Рецензии на модерации ({pendingReviews.length})</h2>
        {pendingReviews.length === 0 ? (
          <p className="admin-empty">Нет рецензий для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingReviews.map(r => (
              <div key={r._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {r.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {r.filmId?.title || 'Фильм'}</span>
                </div>
                <h4 className="admin-item-title">{r.title}</h4>
                <p className="admin-item-text">{r.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveReview(r._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectReview(r._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
