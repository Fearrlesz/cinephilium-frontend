// src/pages/FilmsCatalogPage/FilmsCatalogPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Header from '../../components/Header';
import FilmsCatalog from '../../components/FilmsCatalog';
import { useNotification } from '../../context/NotificationContext';
import './FilmsCatalogPage.css';

function FilmsCatalogPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
      });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  }, [navigate, showNotification]);

  return (
    <div className="container">
      <Header user={user} onLogout={handleLogout} />
      <div className="catalog-header glass-card">
        <h2>🎬 Каталог фильмов</h2>
        <p>Все фильмы, добавленные сообществом</p>
      </div>
      <FilmsCatalog initialSort="technical" limit={20} showSortTabs={true} />
    </div>
  );
}

export default FilmsCatalogPage;
