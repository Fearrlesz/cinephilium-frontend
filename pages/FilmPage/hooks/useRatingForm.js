import { useState, useCallback } from 'react';
import api from '../../../api/client';
import { CRITERIA_CONFIG, PRESET_WEIGHTS } from '../../../utils/constants';

const createEmptyScores = () => Object.fromEntries(
  CRITERIA_CONFIG.map(b => [b.key, Object.fromEntries(b.criteria.map(c => [c.key, 5]))])
);

function useRatingForm(filmId, film, userRating, currentUser, loadFilm, loadFilmUsers, setUserRating, showNotification, navigate, addEvent) {
  const [scores, setScores] = useState(createEmptyScores);
  const [vibe, setVibe] = useState(5);
  const [genrePreset, setGenrePreset] = useState('');
  const [blockWeights, setBlockWeights] = useState([30,25,20,15,10]);
  const [textReview, setTextReview] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const initializeForm = useCallback((rating) => {
    if (rating) {
      if (rating.scores) {
        setScores(rating.scores);
      } else {
        setScores(createEmptyScores());
      }
      setVibe(rating.vibe || 5);
      setGenrePreset(rating.genrePreset || '');
      if (rating.blockWeights) {
        const weights = [
          rating.blockWeights.scenario || 30,
          rating.blockWeights.characters || 25,
          rating.blockWeights.visual || 20,
          rating.blockWeights.sound || 15,
          rating.blockWeights.style || 10
        ];
        setBlockWeights(weights);
      } else {
        setBlockWeights([30,25,20,15,10]);
      }
      setTextReview(rating.textReview || '');
    } else {
      setScores(createEmptyScores());
      setVibe(5);
      setGenrePreset('');
      setBlockWeights([30,25,20,15,10]);
      setTextReview('');
    }
  }, []);

  const resetForm = useCallback(() => {
    initializeForm(userRating);
  }, [userRating, initializeForm]);

  const handleGenreChange = (key) => {
    setGenrePreset(key);
    if (key === '') {
      setBlockWeights([30,25,20,15,10]);
    } else if (key === 'hybrid') {
      setBlockWeights([20,20,20,20,20]);
    } else {
      setBlockWeights(PRESET_WEIGHTS[key] || [30,25,20,15,10]);
    }
  };

  const handleWeightChange = (i, value) => {
    setGenrePreset('hybrid');
    setBlockWeights(prev => prev.map((w,j) => j === i ? Number(value) : w));
  };

  const handleRatingChange = (blockKey, critKey, value) => {
    setScores(prev => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey],
        [critKey]: Number(value)
      }
    }));
  };

  const calculatePreview = useCallback(() => {
    const s = scores;
    const avgs = {
      scenario: s.scenario.plot * 0.35 + s.scenario.ideas * 0.35 + s.scenario.dialogue * 0.30,
      characters: s.characters.depth * 0.40 + s.characters.chemistry * 0.35 + s.characters.functionality * 0.25,
      visual: (s.visual.composition + s.visual.cinematography + s.visual.pacing + s.visual.tone) / 4,
      sound: s.sound.music * 0.40 + s.sound.design * 0.35 + s.sound.narrative * 0.25,
      style: (s.style.originality + s.style.boldness) / 2
    };
    const rawTech = 
      avgs.scenario * blockWeights[0] +
      avgs.characters * blockWeights[1] +
      avgs.visual * blockWeights[2] +
      avgs.sound * blockWeights[3] +
      avgs.style * blockWeights[4];
    const tech = Number((rawTech / 100 * 10).toFixed(1));
    const combined = Number((tech * 0.7 + vibe * 3).toFixed(1));
    return { tech, vibe, combined };
  }, [scores, vibe, blockWeights]);

  const saveRating = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы оценивать фильмы', type: 'warning' });
      navigate('/login');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const response = await api.post('/ratings', {
        filmId: filmId,
        scores,
        vibe,
        genrePreset: genrePreset || null,
        blockWeights,
        textReview
      });

      setUserRating(response.data.rating);
      await loadFilm();
      await loadFilmUsers();

      if (currentUser && film) {
        await addEvent({
          type: 'rating',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id,
          score: response.data.combinedScore
        });
      }

      showNotification({ title: 'Оценка сохранена!', message: 'Ваша оценка успешно добавлена', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.message || 'Не удалось сохранить оценку', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [filmId, scores, vibe, genrePreset, blockWeights, textReview, isSaving, showNotification, navigate, currentUser, film, addEvent, setUserRating, loadFilm, loadFilmUsers]);

  const weightsValid = blockWeights.reduce((a,b) => a+b, 0) === 100;

  return {
    scores,
    setScores,
    vibe,
    setVibe,
    genrePreset,
    setGenrePreset,
    blockWeights,
    setBlockWeights,
    textReview,
    setTextReview,
    isSaving,
    setIsSaving,
    weightsValid,
    calculatePreview,
    saveRating,
    handleGenreChange,
    handleWeightChange,
    handleRatingChange,
    resetForm,
    initializeForm
  };
}

export default useRatingForm;
