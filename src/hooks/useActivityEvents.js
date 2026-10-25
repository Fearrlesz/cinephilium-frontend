import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getTimeAgo } from '../utils/ratingUtils';

const VALID_EVENT_TYPES = ['rating', 'review', 'comment', 'film_add', 'achievement'];

// Лента событий теперь полностью серверная: бэкенд сам создаёт события при
// оценках, рецензиях, комментариях и модерации. Раньше фронтенд дублировал их
// через POST /events, но такого эндпоинта в API нет (и дубли не нужны).
// Хук оставлен с прежним интерфейсом, чтобы не менять компоненты.
function useActivityEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/events');
      if (response.data && Array.isArray(response.data)) {
        setEvents(response.data.map(event => ({
          ...event,
          time: event.time || getTimeAgo(event.createdAt) || 'только что',
          _synced: true
        })));
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки событий:', err?.message || err);
      setError('Не удалось загрузить события');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Локальное «оптимистичное» событие: сервер пришлёт настоящее при следующем
  // обновлении ленты, поэтому запрос на создание не отправляем.
  const addEvent = useCallback(async (eventData) => {
    if (!eventData.type || !VALID_EVENT_TYPES.includes(eventData.type)) {
      console.error('Некорректный тип события:', eventData.type);
      return false;
    }
    if (!eventData.user) {
      console.error('Не указан пользователь события');
      return false;
    }

    const filmId = eventData.filmId || eventData.metadata?.filmId || eventData.film?._id || eventData.film;
    if (eventData.type !== 'achievement' && !filmId) {
      console.error('Для события типа', eventData.type, 'не указан filmId');
      return false;
    }

    const newEvent = {
      _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      _synced: false,
      time: 'только что',
      createdAt: new Date().toISOString(),
      ...eventData,
      filmId: filmId || 'system'
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    return true;
  }, []);

  const removeEvent = useCallback(async (eventId) => {
    // Серверные эндпоинты удаления событий не поддерживаются — скрываем локально.
    setEvents(prev => prev.filter(event => event._id !== eventId));
  }, []);

  const syncPendingEvents = useCallback(async () => {}, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    loading,
    error,
    addEvent,
    removeEvent,
    refresh: loadEvents,
    pendingEvents: 0,
    syncPendingEvents
  };
}

export default useActivityEvents;
