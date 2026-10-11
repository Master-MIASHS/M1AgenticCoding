// Profile page (Groupe 4 - issue #18).
// Displays player information exposed by the Core contract (via coreService)
// and is structured to evolve as the contract grows: optional fields are
// handled defensively and stat cards are data-driven.

import { useCallback, useState } from 'react';
import { getState } from '../../services/coreService.js';
import './profile.css';

const FALLBACK_PSEUDO = 'Joueur Fantôme';

function loadProfile() {
  try {
    return { data: getState(), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Erreur inconnue.',
    };
  }
}

function useProfileData() {
  const [profile, setProfile] = useState(loadProfile);

  const retry = useCallback(() => {
    setProfile(loadProfile());
  }, []);

  return { data: profile.data, error: profile.error, retry };
}

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('fr-FR')
    : '—';
}

function formatRole(role) {
  return role === 'admin' ? 'Administrateur' : 'Joueur';
}

function formatDate(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitial(pseudo) {
  const trimmed = typeof pseudo === 'string' ? pseudo.trim() : '';
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

// Le seuil d'XP du niveau suivant n'est pas encore exposé par le contrat du
// Core : la barre reste neutre tant que ce champ est absent, puis se remplit
// automatiquement dès qu'il sera fourni.
function getLevelProgress(state) {
  const threshold = state.xpForNextLevel;
  if (typeof threshold === 'number' && threshold > 0) {
    const ratio = Math.min(Math.max(state.xp / threshold, 0), 1);
    return { percent: Math.round(ratio * 100), threshold };
  }
  return { percent: null, threshold: null };
}

function ProfileHeader({ state }) {
  const pseudo =
    typeof state.pseudo === 'string' && state.pseudo ? state.pseudo : FALLBACK_PSEUDO;
  const progress = getLevelProgress(state);

  return (
    <header className="profile__header">
      <div className="profile__avatar" aria-hidden="true">
        {getInitial(pseudo)}
      </div>
      <div className="profile__identity">
        <h2 className="profile__pseudo">{pseudo}</h2>
        <div className="profile__badges">
          <span className="profile__badge profile__badge--level">
            Niveau {formatNumber(state.level)}
          </span>
          <span className="profile__badge">{formatRole(state.role)}</span>
        </div>
      </div>
      <div className="profile__xp">
        <div
          className="profile__xp-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          {progress.percent !== null && (
            <div className="profile__xp-fill" style={{ width: `${progress.percent}%` }} />
          )}
        </div>
        <span className="profile__xp-label">
          XP {formatNumber(state.xp)}
          {progress.threshold !== null && ` / ${formatNumber(progress.threshold)}`}
        </span>
      </div>
    </header>
  );
}

function ProfileSection({ title, children }) {
  return (
    <section className="profile__section">
      <h2 className="profile__section-title">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="profile__stat-card">
      <span className="profile__stat-value">{value}</span>
      <span className="profile__stat-label">{label}</span>
    </div>
  );
}

function UnlockedGames({ games }) {
  if (games.length === 0) {
    return <p className="profile__empty">Aucun jeu déverrouillé.</p>;
  }
  return (
    <ul className="profile__games">
      {games.map((gameId) => (
        <li key={gameId} className="profile__chip">
          {gameId}
        </li>
      ))}
    </ul>
  );
}

function HistoryList({ history }) {
  if (history.length === 0) {
    return <p className="profile__empty">Aucune partie jouée pour l&apos;instant.</p>;
  }
  return (
    <ul className="profile__history">
      {history.map((entry, index) => {
        const game = entry?.gameId ?? entry?.game;
        return (
          <li key={index} className="profile__history-item">
            <span className="profile__history-game">{game ?? '—'}</span>
            {typeof entry?.result === 'string' && (
              <span className="profile__history-result">{entry.result}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Profile() {
  const { data, error, retry } = useProfileData();

  if (error) {
    return (
      <div className="page-profile">
        <h1 className="profile__title">Profil</h1>
        <div className="profile profile--error">
          <p className="profile__error">
            Impossible de charger les informations du profil.
          </p>
          <button type="button" className="profile__retry" onClick={retry}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-profile">
        <h1 className="profile__title">Profil</h1>
        <p className="profile__empty">Aucune donnée disponible.</p>
      </div>
    );
  }

  const birthDate = formatDate(data.birthDate);
  const unlockedGames = Array.isArray(data.unlockedGames) ? data.unlockedGames : [];
  const history = Array.isArray(data.history) ? data.history : [];

  return (
    <div className="page-profile">
      <h1 className="profile__title">Profil</h1>
      <div className="profile">
        <ProfileHeader state={data} />

        <ProfileSection title="Informations principales">
          <dl className="profile__fields">
            <div className="profile__field">
              <dt>Solde</dt>
              <dd className="profile__value profile__value--accent">
                {formatNumber(data.balance)}
              </dd>
            </div>
            <div className="profile__field">
              <dt>Meilleur solde</dt>
              <dd className="profile__value">{formatNumber(data.bestBalance)}</dd>
            </div>
            <div className="profile__field">
              <dt>Niveau</dt>
              <dd className="profile__value">{formatNumber(data.level)}</dd>
            </div>
            <div className="profile__field">
              <dt>XP totale</dt>
              <dd className="profile__value">{formatNumber(data.xp)}</dd>
            </div>
            <div className="profile__field">
              <dt>Rôle</dt>
              <dd className="profile__value">{formatRole(data.role)}</dd>
            </div>
            {birthDate && (
              <div className="profile__field">
                <dt>Date de naissance</dt>
                <dd className="profile__value">{birthDate}</dd>
              </div>
            )}
          </dl>
        </ProfileSection>

        <ProfileSection title="Jeux déverrouillés">
          <UnlockedGames games={unlockedGames} />
        </ProfileSection>

        <ProfileSection title="Statistiques_TEEEEST">
          <div className="profile__stats">
            <StatCard label="Meilleur solde" value={formatNumber(data.bestBalance)} />
            <StatCard label="Jeux déverrouillés" value={formatNumber(unlockedGames.length)} />
            <StatCard label="Parties jouées" value={formatNumber(history.length)} />
          </div>
        </ProfileSection>

        <ProfileSection title="Historique des parties">
          <HistoryList history={history} />
        </ProfileSection>
      </div>
    </div>
  );
}

export default Profile;
