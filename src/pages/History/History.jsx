// History page (Groupe 4): the player's real history, read with getHistory().
// Games have no `type`; admin adjustments have type 'ADMIN_ADJUSTMENT'.

import { getHistory } from '../../services/coreService.js';

const OUTCOME_LABELS = { win: 'Gagné', loss: 'Perdu', push: 'Égalité' };

function readHistory() {
  try {
    const history = getHistory();
    return Array.isArray(history) ? history : [];
  } catch {
    return null;
  }
}

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('fr-FR') : '—';
}

function formatDate(value) {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('fr-FR') : '—';
}

function History() {
  const history = readHistory();
  return (
    <section aria-labelledby="history-title">
      <h1 id="history-title">Mon historique</h1>
      {history === null ? (
        <p role="alert">Impossible de charger l’historique.</p>
      ) : history.length === 0 ? (
        <p>Aucune partie jouée pour l’instant.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Jeu</th>
              <th scope="col">Mise</th>
              <th scope="col">Résultat</th>
              <th scope="col">Gain net</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((entry, index) => {
              const adjustment = entry?.type === 'ADMIN_ADJUSTMENT';
              return (
                <tr key={entry?.roundId ?? `${entry?.playedAt}-${index}`}>
                  <td>{formatDate(entry?.playedAt ?? entry?.date)}</td>
                  <td>{adjustment ? 'Ajustement admin' : (entry?.gameId ?? '—')}</td>
                  <td>{adjustment ? '—' : formatNumber(entry?.bet)}</td>
                  <td>{adjustment ? '—' : (OUTCOME_LABELS[entry?.outcome] ?? '—')}</td>
                  <td>{formatNumber(entry?.netGain ?? entry?.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default History;
