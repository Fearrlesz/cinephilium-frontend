import { useNavigate } from 'react-router-dom';
import useCriticData from '../../hooks/useCriticData';
import CriticHero from '../../components/Critic/CriticHero';
import CriticTopMovies from '../../components/Critic/CriticTopMovies';
import CriticReviews from '../../components/Critic/CriticReviews';
import { CRITIC_META, CRITIC_REVIEWS } from '../../utils/mockCriticData';
import './CriticPage.css';

export default function CriticPage() {
  const navigate = useNavigate();
  const { critic, topMovies, loading, error } = useCriticData();

  if (loading) return <div className="loading">Загрузка...</div>;

  if (error) {
    return (
      <div className="container">
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
        <div className="error-msg" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>😕 {error}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container critic-page">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

      <CriticHero
        critic={critic}
        tagline={CRITIC_META.tagline}
        bio={CRITIC_META.bio}
      />

      <CriticTopMovies movies={topMovies} />

      <CriticReviews reviews={CRITIC_REVIEWS} />
    </div>
  );
}
