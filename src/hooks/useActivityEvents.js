import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getTimeAgo } from '../utils/ratingUtils';

const VALID_EVENT_TYPES = ['rating', 'review', 'comment', 'film_add', 'achievement'];

function useActivityEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingEvents, setPendingEvents] = useState(new Map());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/events');
      if (response.data && Array.isArray(response.data)) {
        const formattedEvents = response.data.map(e => ({
          ...e,
          time: e.time || getTimeAgo(e.createdAt) || 'только что',
          _synced: true
        }));
        setEvents(formattedEvents);
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

  const addEvent = useCallback(async (eventData) => {
    if (!eventData.type || !VALID_EVENT_TYPES.includes(eventData.type)) {
      console.error('Некорректный тип события:', eventData.type);
      return false;
    }
    if (!eventData.user) {
      console.error('Не указан пользователь события');
      return false;
    }

    let filmId = eventData.filmId || eventData.metadata?.filmId || eventData.film?._id || eventData.film;
    if (eventData.type !== 'achievement' && !filmId) {
      console.error('Для события типа', eventData.type, 'не указан filmId');
      return false;
    }
    if (eventData.type === 'achievement' && !filmId) {
      filmId = 'system';
    }

    const duplicate = events.some(e =>
      e.type === eventData.type &&
      e.user === eventData.user &&
      e.film === eventData.film &&
      e.score === eventData.score &&
      (Date.now() - new Date(e.createdAt || e.time).getTime() < 5000)
    );
    if (duplicate) {
      console.warn('Обнаружен дубликат события, пропускаем');
      return false;
    }

    const payload = {
      type: eventData.type,
      user: eventData.user,
      film: eventData.film,
      filmId: filmId,
      score: eventData.score || null,
      metadata: eventData.metadata || null
    };

    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newEvent = {
      _id: localId,
      _synced: false,
      time: 'только что',
      ...eventData,
      filmId
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    setPendingEvents(prev => {
      const m = new Map(prev);
      m.set(localId, payload);
      return m;
    });

    try {
      const response = await api.post('/events', payload);
      if (response.data && response.data._id) {
        setEvents(prev => prev.map(e =>
          e._id === localId ? { ...e, _id: response.data._id, _synced: true, createdAt: response.data.createdAt || e.createdAt } : e
        ));
        setPendingEvents(prev => {
          const m = new Map(prev);
          m.delete(localId);
          return m;
        });
        return true;
      } else {
        throw new Error('Сервер не вернул _id');
      }
    } catch (err) {
      console.error('Ошибка сохранения события:', err?.message || err);
      return false;
    }
  }, [events]);

  const syncPendingEvents = useCallback(async () => {
    const pending = Array.from(pendingEvents.entries());
    if (pending.length === 0) return;

    for (const [localId, payload] of pending) {
      try {
        const response = await api.post('/events', payload);
        if (response.data && response.data._id) {
          setEvents(prev => prev.map(e =>
            e._id === localId ? { ...e, _id: response.data._id, _synced: true } : e
          ));
          setPendingEvents(prev => {
            const m = new Map(prev);
            m.delete(localId);
            return m;
          });
        }
      } catch (err) {
        console.error(`Ошибка синхронизации ${localId}:`, err?.message || err);
      }
    }
  }, [pendingEvents]);

  const removeEvent = useCallback(async (eventId) => {
    const isLocal = String(eventId).startsWith('local_');
    if (isLocal) {
      setEvents(prev => prev.filter(e => e._id !== eventId));
      setPendingEvents(prev => {
        const m = new Map(prev);
        m.delete(eventId);
        return m;
      });
      return;
    }
    try {
      await api.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e._id !== eventId));
    } catch (err) {
      console.error('Ошибка удаления события:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const interval = setInterval(syncPendingEvents, 30000);
    return () => clearInterval(interval);
  }, [syncPendingEvents]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingEvents.size > 0) {
        console.log('Отправка несинхронизированных событий перед выгрузкой...');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingEvents]);

  return {
    events,
    loading,
    error,
    addEvent,
    removeEvent,
    refresh: loadEvents,
    pendingEvents: pendingEvents.size,
    syncPendingEvents
  };
}

export default useActivityEvents;
