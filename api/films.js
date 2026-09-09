import api from './client';

export const getFilms = (page = 1, limit = 20, sort = 'technical') => {
  return api.get(`/films?page=${page}&limit=${limit}&sort=${sort}`);
};

export const getFilm = (id) => {
  return api.get(`/films/${id}`);
};

export const importFilm = (tmdbId) => {
  return api.post('/films/import', { tmdbId });
};

export const getFilmUsers = (id) => {
  return api.get(`/films/${id}/users`);
};

export const searchTMDB = (query) => {
  return api.get('/tmdb/search', { params: { query } });
};
