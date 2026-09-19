import api from './client';

export const getUserIdByNickname = (nickname) => {
  return api.get(`/users/nickname/${encodeURIComponent(nickname)}`);
};

export const getUserProfileById = (id) => {
  return api.get(`/users/${id}`);
};
