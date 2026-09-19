import './CriticHero.css';

export default function CriticHero({ critic, tagline, bio }) {
  return (
    <section className="critic-hero glass-card">
      <div className="critic-hero__avatar">
        <div className="avatar-placeholder">{critic?.nickname?.[0] || '?'}</div>
      </div>
      <div className="critic-hero__info">
        <h1>
          {critic?.nickname}
          {critic?.isExclusive && (
            <span className="exclusive-badge"> 🇮🇹 Архитектор Синефилиума</span>
          )}
        </h1>
        {tagline && <p className="critic-hero__tagline">«{tagline}»</p>}
        {bio && <p className="critic-hero__bio">{bio}</p>}
      </div>
    </section>
  );
}
