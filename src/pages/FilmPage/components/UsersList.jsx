import React from 'react';
import { Link } from 'react-router-dom';
import { getScoreColor } from '../../../utils/constants';
import './UsersList.css';

function UsersList({ filmUsers, usersLoading, onShowUsers, onOpenRatingDetails }) {
  return (
    <div className="film-users glass-card">
      <div className="film-users-header">
        <h3>👥 Оценили фильм: <strong>{filmUsers.length}</strong> человек</h3>
        {filmUsers.length > 0 && (
          <button className="btn-show-users" onClick={onShowUsers}>
            👁️ Подробнее
          </button>
        )}
      </div>
      
      {usersLoading ? (
        <div className="loading-users">Загрузка...</div>
      ) : filmUsers.length === 0 ? (
        <p className="no-users">Пока никто не оценил этот фильм. Будьте первым! ⭐</p>
      ) : (
        <div className="users-preview">
          {filmUsers.slice(0, 5).map((item) => (
            <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item-preview">
              <Link to={`/user/${item.user._id}`} className="user-link">👤 {item.user.nickname || 'Пользователь'}</Link>
              <span className="user-rating-score" style={{ color: getScoreColor(item.rating.finalScore) }}>
                {item.rating.finalScore}
              </span>
            </div>
          ))}
          {filmUsers.length > 5 && (
            <div className="more-users">и ещё {filmUsers.length - 5} человек...</div>
          )}
        </div>
      )}
    </div>
  );
}

export default UsersList;
