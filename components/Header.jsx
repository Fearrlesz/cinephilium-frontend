import React from 'react';
import { Link } from 'react-router-dom';

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <h1>🎬 СИНЕФИЛИУМ</h1>
      <div className="header-actions">
        <Link to="/about" className="btn-about">📖 О системе</Link>
        <Link to="/top" className="btn-top">🏆 Топ</Link>
        <a href="https://t.me/Cinephilium" target="_blank" rel="noopener noreferrer" className="btn-telegram">📱 Telegram</a>
        {user ? (
          <>
            <Link to={`/user/${user._id}`} className="btn-profile">👤 {user.nickname}</Link>
            {user.isAdmin && <Link to="/admin" className="btn-admin">🛡️ Админка</Link>}
            <button onClick={onLogout} className="btn-logout">Выйти</button>
          </>
        ) : (
          <Link to="/login" className="btn-login">Войти</Link>
        )}
      </div>
    </header>
  );
}

export default Header;
