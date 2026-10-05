// Leaderboard page (Groupe 4 - issue #35).
// Displays the ranking exposed by the Core contract (via coreService).
// The order supplied by the Core is authoritative: the UI never sorts or
// recomputes it. The contract has no `rank` field, so the rank is the
// position in the list.

import { useCallback, useState } from 'react';
import { getLeaderboard, getState } from '../../services/coreService.js';
import './leaderboard.css';

const FALLBACK_PSEUDO = 'Joueur Fantôme';
const PODIUM_SIZE = 3;

function loadLeaderboard() {
  try {
    const entries = getLeaderboard();
    return {
      entries: Array.isArray(entries) ? entries : [],
      currentPseudo: getState()?.pseudo ?? null,
      error: null,
    };
  } catch (err) {
    return {
      entries: [],
      currentPseudo: null,
      error: err instanceof Error ? err.message : 'Erreur inconnue.',
    };
  }
}

function useLeaderboardData() {
  const [data, setData] = useState(loadLeaderboard);

  const retry = useCallback(() => {
    setData(loadLeaderboard());
  }, []);

  return { ...data, retry };
}

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('fr-FR')
    : '—';
}

function getPseudo(entry) {
  return typeof entry?.pseudo === 'string' && entry.pseudo ? entry.pseudo : FALLBACK_PSEUDO;
}

function LeaderboardRow({ entry, rank, isCurrent }) {
  const classes = ['leaderboard__row'];
  if (rank <= PODIUM_SIZE) {
    classes.push(`leaderboard__row--podium-${rank}`);
  }
  if (isCurrent) {
    classes.push('leaderboard__row--current');
  }

  return (
    <tr className={classes.join(' ')} aria-current={isCurrent ? 'true' : undefined}>
      <th scope="row" className="leaderboard__rank">
        {rank}
      </th>
      <td className="leaderboard__pseudo">
        {getPseudo(entry)}
        {isCurrent && <span className="leaderboard__you"> (vous)</span>}
      </td>
      <td className="leaderboard__level">{formatNumber(entry?.level)}</td>
      <td className="leaderboard__balance">{formatNumber(entry?.balance)}</td>
    </tr>
  );
}

function Leaderboard() {
  const { entries, currentPseudo, error, retry } = useLeaderboardData();

  if (error) {
    return (
      <div className="page-leaderboard">
        <h1 className="leaderboard__title">Classement</h1>
        <div className="leaderboard leaderboard--error">
          <p className="leaderboard__error">Impossible de charger le classement.</p>
          <button type="button" className="leaderboard__retry" onClick={retry}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="page-leaderboard">
        <h1 className="leaderboard__title">Classement</h1>
        <p className="leaderboard__empty">Aucun joueur classé pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="page-leaderboard">
      <h1 className="leaderboard__title">Classement</h1>
      <div className="leaderboard">
        <table className="leaderboard__table">
          <thead>
            <tr>
              <th scope="col">Rang</th>
              <th scope="col">Joueur</th>
              <th scope="col">Niveau</th>
              <th scope="col">Solde</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={`${getPseudo(entry)}-${index}`}
                entry={entry}
                rank={index + 1}
                isCurrent={
                  typeof currentPseudo === 'string' &&
                  currentPseudo !== '' &&
                  entry?.pseudo === currentPseudo
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;
