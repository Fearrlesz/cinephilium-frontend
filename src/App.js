import React, { useState, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import './App.css';

// Ленивая загрузка страниц — каждая уедет в отдельный чанк
const HomePage        = lazy(() => import('./pages/HomePage'));
const AboutPage       = lazy(() => import('./pages/AboutPage'));
const TopUsersPage    = lazy(() => import('./pages/TopUsersPage'));
const AdminPanel      = lazy(() => import('./pages/AdminPanel'));
const FilmPage        = lazy(() => import('./pages/FilmPage/FilmPage'));
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

function App() {
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const showNotification = useCallback(({ title, message, type = 'success' }) => {
    setNotification(prev =>
      prev.isOpen
        ? { ...prev, title, message, type }
        : { isOpen: true, title, message, type }
    );

    if (window.notificationTimer) clearTimeout(window.notificationTimer);

    window.notificationTimer = setTimeout(() => {
      setNotification(prev => ({ ...prev, isOpen: false }));
      window.notificationTimer = null;
    }, 5000);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <Router>
        <Suspense fallback={<div className="app-loader">Загрузка…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/top" element={<TopUsersPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/film/:id" element={<FilmPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/user/:id" element={<UserProfilePage />} />
          </Routes>
        </Suspense>
      </Router>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </NotificationContext.Provider>
  );
}

export default App;
