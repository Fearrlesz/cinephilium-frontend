import React from 'react';
import { Link } from 'react-router-dom';
import './UsersList.css';

function UsersList({ filmUsers, usersLoading, onShowUsers }) {
  return (
    <section className="film-users">
      <div className="sec-head">
        <h2 className="sec-title">
          Оценили фильм <span className="sec-count">{filmUsers.length}</span>
        </h2>
        {filmUsers.length > 0 && (
          <button type="button" className="link-btn" onClick={onShowUsers}>
            Все оценки
          </button>
        )}
      </div>

      {usersLoading ? (
        <p className="empty-line">Загрузка…</p>
      ) : filmUsers.length === 0 ? (
        <p className="empty-line">Пока никто не оценил этот фильм.</p>
      ) : (
        <div className="users-row">
          {filmUsers.slice(0, 5).map(item => {
            const nickname = item.user.nickname || 'Пользователь';
            // F1-fix: /films/:id/users отдаёт finalScore: 0 для vibe-only.
            const isVibeOnly = item.rating.completeness === 'vibe';
            return (
              <Link
                to={`/user/${item.user._id}`}
                className="user-chip" key={`${item.user._id}-${item.rating._id}`}
              >
                <span className="user-av" aria-hidden="true">
                  {nickname.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{nickname}</span>
                <span
                  className="user-score" title={isVibeOnly ? 'Только вайб — комбинированный не вычислен' : undefined}
                >
                  {isVibeOnly ? '—' : item.rating.finalScore}
                </span>
              </Link>
            );
          })}

          {filmUsers.length > 5 && (
            <span className="users-more">и ещё {filmUsers.length - 5}</span>
          )}
        </div>
      )}
    </section>
  );
}

export default UsersList;
