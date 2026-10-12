import { getState, getGlobalStats } from '../../services/coreService.js';
import './Statistics.css';

function Statistics() {
  const { balance, bestBalance } = getState();

  let stats = null;
  let statsError = false;

  try {
    stats = getGlobalStats();
  } catch (error) {
    console.error('Impossible de récupérer les statistiques :', error);
    statsError = true;
  }

  const { totalPlays, totalWagered, totalWon, activePlayers } = stats ?? {};

  return (
    <div className="page-statistics">
      <h1>Statistiques</h1>
      <p className="page-statistics__notice">
        Les données affichées sont actuellement simulées.
      </p>

      <section aria-labelledby="statistics-player-title">
        <h2 id="statistics-player-title">Vos soldes</h2>
        <dl className="page-statistics__values">
          <div className="page-statistics__card">
            <dt>Solde actuel</dt>
            <dd>{balance}</dd>
          </div>
          <div className="page-statistics__card">
            <dt>Meilleur solde</dt>
            <dd>{bestBalance}</dd>
          </div>
        </dl>
      </section>

      <section
        className="page-statistics__global"
        aria-labelledby="statistics-global-title"
      >
        <h2 id="statistics-global-title">Statistiques globales du casino</h2>

        {statsError ? (
          <p role="alert">Statistiques indisponibles pour le moment.</p>
        ) : (
          <dl className="page-statistics__values">
            <div className="page-statistics__card">
              <dt>Nombre total de parties</dt>
              <dd>{totalPlays}</dd>
            </div>
            <div className="page-statistics__card">
              <dt>Total des mises</dt>
              <dd>{totalWagered}</dd>
            </div>
            <div className="page-statistics__card">
              <dt>Total des gains</dt>
              <dd>{totalWon}</dd>
            </div>
            <div className="page-statistics__card">
              <dt>Joueurs actifs</dt>
              <dd>{activePlayers}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}

export default Statistics;
