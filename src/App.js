import React, { useState, useCallback } from 'react'; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import HomePage from './pages/HomePage/HomePage';
import AboutPage from './pages/AboutPage/AboutPage';
import TopUsersPage from './pages/TopUsersPage/TopUsersPage';
import AdminPanel from './pages/AdminPanel/AdminPanel';
import FilmPage from './pages/FilmPage/FilmPage';
import CustomSelect from './components/CustomSelect';
import LoginPage from './pages/LoginPage/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import PrivacyPage from './pages/PrivacyPage/PrivacyPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import UserProfilePage from './pages/UserProfilePage/UserProfilePage';
import CriticPage from './pages/CriticPage/CriticPage';
import ContactPage from './pages/ContactPage/ContactPage';
import './App.css';

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
