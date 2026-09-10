import React, { useState, useCallback } from 'react'; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import TopUsersPage from './pages/TopUsersPage';
import AdminPanel from './pages/AdminPanel';
import FilmPage from './pages/FilmPage/FilmPage';
import CustomSelect from './components/CustomSelect';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
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
          <Route path="/film/:id" element={<FilmPage />} />
          <Route path="/login" element={<LoginPage />} />
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
