import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import ProfileView from './ProfileView';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/auth/me')
      .then(response => {
        if (!cancelled) setUser(response.data);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        setError('Не удалось загрузить профиль');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) return <div className="loading">Загрузка…</div>;
  if (error) return <div className="profile-page"><p className="profile-error">{error}</p></div>;
  if (!user) return <div className="profile-page"><p className="profile-error">Профиль не найден</p></div>;

  return (
    <ProfileView
      userId={user._id || user.id}
      isOwnProfile
      initialUser={user}
    />
  );
}

export default ProfilePage;
