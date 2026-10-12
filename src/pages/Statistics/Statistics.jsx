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
        Les statistiques sont calculées à partir de l&apos;historique de vos parties enregistrées sur cet appareil.
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
        <h2 id="statistics-global-title">Statistiques de vos parties</h2>

        {statsError ? (
          <p role="alert">Statistiques indisponibles pour le moment.</p>
        ) : (
          <>
            {totalPlays === 0 && (
              <p>Aucune partie n&apos;est enregistrée dans votre historique pour le moment.</p>
            )}
            <p>
              Le nombre de joueurs actifs correspond au profil local ayant enregistré au moins une partie (0 ou 1), et non au nombre de personnes connectées au casino.
            </p>
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
                <dt>Total reversé (mises incluses)</dt>
                <dd>{totalWon}</dd>
              </div>
              <div className="page-statistics__card">
                <dt>Joueurs actifs</dt>
                <dd>{activePlayers}</dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </div>
  );
}

export default Statistics;
