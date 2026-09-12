import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
  lazy,
  Suspense,
} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotificationContext from './context/NotificationContext';
import NotificationModal from './components/NotificationModal';
import CustomSelect from './components/CustomSelect';
import './App.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TopUsersPage = lazy(() => import('./pages/TopUsersPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const FilmPage = lazy(() => import('./pages/FilmPage/FilmPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

// Мемоизируем модалку, чтобы она не перерисовывалась, когда пропсы не меняются
const MemoNotificationModal = memo(NotificationModal);

function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNotification = useCallback(
    ({ title, message, type = 'success' }) => {
      clearTimer();
      // один setState вместо функционального апдейта — быстрее
      setNotification({ isOpen: true, title, message, type });

      timerRef.current = setTimeout(() => {
        setNotification(prev => ({ ...prev, isOpen: false }));
        timerRef.current = null;
      }, 5000);
    },
    [clearTimer]
  );

  const closeNotification = useCallback(() => {
    clearTimer();
    setNotification(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, [clearTimer]);

  // очистка таймера при размонтировании
  useEffect(() => clearTimer, [clearTimer]);

  // контекст не меняется при перерисовке провайдера
  const contextValue = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <MemoNotificationModal
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
        <Suspense fallback={<div>Загрузка...</div>}>
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
    </NotificationProvider>
  );
}

export default App;
