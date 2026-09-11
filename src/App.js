import React, { useState, useCallback } from 'react'; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import CustomSelect from './components/CustomSelect';
import './App.css';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const TopUsersPage = React.lazy(() => import('./pages/TopUsersPage'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const FilmPage = React.lazy(() => import('./pages/FilmPage/FilmPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));

function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  const timerRef = React.useRef(null);

  const showNotification = useCallback(({ title, message, type = 'success' }) => {
    setNotification(prev => {
      if (prev.isOpen) {
        return { ...prev, title, message, type };
      }
      return { isOpen: true, title, message, type };
    });

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, isOpen: false }));
      timerRef.current = null;
    }, 5000);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const contextValue = React.useMemo(
    () => ({ showNotification }),
    [showNotification]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
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

function App() {
  return (
    <NotificationProvider>
      <Router>
        <React.Suspense fallback={<div>Загрузка...</div>}>
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
        </React.Suspense>
      </Router>
    </NotificationProvider>
  );
}

export default App;
