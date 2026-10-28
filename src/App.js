import React, { useState, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import HomePage from './pages/HomePage/HomePage';
import FilmPage from './pages/FilmPage/FilmPage';
import LoginPage from './pages/LoginPage/LoginPage';
import './App.css';

// Главные экраны грузим сразу, остальные — отдельными чанками по переходу.
// На кэширование HTML это не влияет: свежесть версии по-прежнему задаёт
// index.html, а не отдельный чанк.
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage'));
const TopUsersPage = lazy(() => import('./pages/TopUsersPage/TopUsersPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel/AdminPanel'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage/ResetPasswordPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage/PrivacyPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage/UserProfilePage'));
const CriticPage = lazy(() => import('./pages/CriticPage/CriticPage'));
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage'));

function App() {
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const showNotification = useCallback(({ title, message, type = 'success' }) => {
    setNotification(prev => {
      if (prev.isOpen) {
        return { ...prev, title, message, type };
      }
      return { isOpen: true, title, message, type };
    });
    if (window.notificationTimer) {
      clearTimeout(window.notificationTimer);
    }
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
        <Suspense fallback={<div className="loading">Загрузка...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/top" element={<TopUsersPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/critic" element={<CriticPage />} />
            <Route path="/film/:id" element={<FilmPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
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
