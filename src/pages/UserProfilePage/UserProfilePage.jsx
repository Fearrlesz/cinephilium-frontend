import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import ProfileView from '../ProfilePage/ProfileView';

function UserProfilePage() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      return undefined;
    }

    let cancelled = false;
    api.get('/auth/me')
      .then(response => {
        if (!cancelled) setCurrentUser(response.data);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      });

    return () => { cancelled = true; };
  }, [id]);

  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwnProfile = Boolean(currentUserId) && String(currentUserId) === String(id);

  return (
    <ProfileView
      key={id}
      userId={id}
      isOwnProfile={isOwnProfile}
    />
  );
}

export default UserProfilePage;
