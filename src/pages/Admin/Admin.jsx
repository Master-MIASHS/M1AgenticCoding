// ---------------------------------------------------------------------------
// Admin screen (Groupe 4)
// ---------------------------------------------------------------------------
// Displays the Core global statistics and lets an admin edit each game's
// runtime configuration (probabilities / multipliers) on top of the Core
// mock. This is strictly a raw interface over the Core, reached only through
// the coreService facade. There is no business logic, no real
// authentication, and no server-side role check at this stage.
//
// The screen wraps itself in the existing AdminLayout so it is already
// integrated in the admin layout, without touching the still-open app
// routing decision.
//
// Fallbacks (clearly marked, to be removed once G1 exposes them via the
// facade — see open issue `groupe: G1`):
//   - the games list falls back to the application-level registry while the
//     Core `GAMES` is not exposed;
//   - the "current config" readout shows an "attente G1" state while the
//     Core `getGameConfig` is not exposed.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout.jsx';
import * as coreService from '../../services/coreService.js';
import { GAME_REGISTRY } from '../../config/gameRegistry.js';
import {
  pickGamesList,
  pickGetGameConfig,
  buildGameConfig,
  configForDisplay,
  statsToDisplay,
  formatNumber,
} from './admin.utils.js';
import './admin.css';

function loadAdminData() {
  try {
    const stats = coreService.getGlobalStats();
    const { list, source } = pickGamesList(coreService.GAMES, GAME_REGISTRY);
    const { fn: readConfig, available: configExposed } = pickGetGameConfig(
      coreService.getGameConfig
    );

    const configs = {};
    for (const game of list) {
      configs[game.id] = readConfig(game.id);
    }

    return {
      data: { stats, games: list, gamesSource: source, configs, configExposed },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erreur inconnue.' };
  }
}

function useAdminData() {
  const [result, setResult] = useState(loadAdminData);

  const refresh = useCallback(() => {
    setResult(loadAdminData());
  }, []);

  return { data: result.data, error: result.error, refresh };
}

function GlobalSettingsSection() {
  const [capital, setCapital] = useState('');
  const [feedback, setFeedback] = useState(null);

  const handleUpdateCapital = (e) => {
    e.preventDefault();
    try {
      coreService.setStartingCapital(Number(capital));
      setFeedback({ type: 'success', message: 'Capital de départ mis à jour !' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <section className="admin__section" aria-labelledby="admin-settings-title">
      <h2 id="admin-settings-title" className="admin__section-title">
        Paramètres globaux
      </h2>
      <form className="admin__form" onSubmit={handleUpdateCapital}>
        <label className="admin__field">
          <span className="admin__field-label">Capital de départ</span>
          <input
            type="number"
            className="admin__input"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="ex: 1000"
          />
        </label>
        <button type="submit" className="admin__submit">Enregistrer</button>
        {feedback && (
          <p className={`admin__feedback admin__feedback--${feedback.type}`}>
            {feedback.message}
          </p>
        )}
      </form>
    </section>
  );
}

function BonusEventsSection() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    id: '',
    cible: 'gains',
    multiplicateur: 2,
    debut: 0,
    fin: 0,
  });
  const [feedback, setFeedback] = useState(null);

  const loadEvents = useCallback(() => {
    try {
      setEvents(coreService.getEvenementsBonus());
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const now = Date.now();
    setNewEvent(prev => ({
      ...prev,
      debut: now,
      fin: now + 86400000,
    }));
  }, [loadEvents]);

  const handleLaunch = (e) => {
    e.preventDefault();
    try {
      coreService.lancerEvenementBonus(newEvent);
      setFeedback({ type: 'success', message: 'Événement bonus lancé !' });
      loadEvents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleStop = (id) => {
    try {
      coreService.arreterEvenementBonus(id);
      setFeedback({ type: 'success', message: 'Événement arrêté !' });
      loadEvents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <section className="admin__section" aria-labelledby="admin-bonus-title">
      <h2 id="admin-bonus-title" className="admin__section-title">
        Événements Bonus
      </h2>
      <form className="admin__form" onSubmit={handleLaunch}>
        <div className="admin__form-row">
          <label className="admin__field">
            <span className="admin__field-label">ID Événement</span>
            <input
              type="text"
              className="admin__input"
              value={newEvent.id}
              onChange={(e) => setNewEvent({ ...newEvent, id: e.target.value })}
              required
            />
          </label>
          <label className="admin__field">
            <span className="admin__field-label">Cible</span>
            <select
              className="admin__input"
              value={newEvent.cible}
              onChange={(e) => setNewEvent({ ...newEvent, cible: e.target.value })}
            >
              <option value="gains">Gains</option>
              <option value="xp">XP</option>
            </select>
          </label>
        </div>
        <div className="admin__form-row">
          <label className="admin__field">
            <span className="admin__field-label">Multiplicateur</span>
            <input
              type="number"
              className="admin__input"
              value={newEvent.multiplicateur}
              onChange={(e) => setNewEvent({ ...newEvent, multiplicateur: Number(e.target.value) })}
              min="1.1"
              step="0.1"
              required
            />
          </label>
          <label className="admin__field">
            <span className="admin__field-label">Début (ms)</span>
            <input
              type="number"
              className="admin__input"
              value={newEvent.debut}
              onChange={(e) => setNewEvent({ ...newEvent, debut: Number(e.target.value) })}
              required
            />
          </label>
          <label className="admin__field">
            <span className="admin__field-label">Fin (ms)</span>
            <input
              type="number"
              className="admin__input"
              value={newEvent.fin}
              onChange={(e) => setNewEvent({ ...newEvent, fin: Number(e.target.value) })}
              required
            />
          </label>
        </div>
          <button type="submit" className="admin__submit">Lancer l&apos;événement</button>

      </form>

      <ul className="admin__bonus-list">
        {events.map((ev) => (
          <li key={ev.id} className="admin__bonus-item">
            <span><strong>{ev.id}</strong> ({ev.cible}) x{ev.multiplicateur}</span>
            <button onClick={() => handleStop(ev.id)} className="admin__btn-stop">Arrêter</button>
          </li>
        ))}
      </ul>
      {feedback && (
        <p className={`admin__feedback admin__feedback--${feedback.type}`}>
          {feedback.message}
        </p>
      )}
    </section>
  );
}

function ModerationSection() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [balanceUpdate, setBalanceUpdate] = useState('');
  const [roleUpdate, setRoleUpdate] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadPlayers = useCallback(() => {
    try {
      // Note: coreService.getPlayers() is not yet implemented by G1. 
      setPlayers([]);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur chargement joueurs' });
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const handleBalanceUpdate = (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    try {
      // This function is the one we requested from G5/G1
      if (coreService.updatePlayerBalance) {
        coreService.updatePlayerBalance(Number(balanceUpdate));
        setFeedback({ type: 'success', message: 'Solde mis à jour !' });
      } else {

        setFeedback({ type: 'error', message: 'Fonction updatePlayerBalance non implémentée par G1' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRoleUpdate = (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    try {
      if (coreService.updatePlayerRole) {
        coreService.updatePlayerRole(selectedPlayer.id, roleUpdate);
        setFeedback({ type: 'success', message: 'Rôle mis à jour !' });
      } else {
        setFeedback({ type: 'error', message: 'Fonction updatePlayerRole non implémentée par G1' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleStatusUpdate = (status) => {
    if (!selectedPlayer) return;
    try {
      if (coreService.setPlayerStatus) {
        coreService.setPlayerStatus(selectedPlayer.id, status);
        setFeedback({ type: 'success', message: 'Statut mis à jour !' });
      } else {
        setFeedback({ type: 'error', message: 'Fonction setPlayerStatus non implémentée par G1' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <section className="admin__section" aria-labelledby="admin-mod-title">
      <h2 id="admin-mod-title" className="admin__section-title">Modération des joueurs</h2>
      <div className="admin__mod-container">
        <ul className="admin__player-list">
          {players.map(p => (
            <li 
              key={p.id} 
              className={`admin__player-item ${selectedPlayer?.id === p.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlayer(p)}
            >
              <span>{p.pseudo}</span>
              <span className={`admin__status ${p.status}`}>{p.status}</span>
            </li>
          ))}
        </ul>

        <div className="admin__mod-details">
          {selectedPlayer ? (
            <>
              <h3>Gestion de {selectedPlayer.pseudo}</h3>
              <form className="admin__form" onSubmit={handleBalanceUpdate}>
                <label className="admin__field">
                  <span className="admin__field-label">Ajuster Solde (+/-)</span>
                  <input 
                    type="number" 
                    className="admin__input" 
                    value={balanceUpdate} 
                    onChange={e => setBalanceUpdate(e.target.value)}
                  />
                </label>
                <button type="submit" className="admin__submit">Appliquer</button>
              </form>

              <form className="admin__form" onSubmit={handleRoleUpdate}>
                <label className="admin__field">
                  <span className="admin__field-label">Changer Rôle</span>
                  <select 
                    className="admin__input" 
                    value={roleUpdate} 
                    onChange={e => setRoleUpdate(e.target.value)}
                  >
                    <option value="player">Joueur</option>
                    <option value="moderator">Modérateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button type="submit" className="admin__submit">Modifier Rôle</button>
              </form>

              <div className="admin__actions">
                <button 
                  className="admin__btn-status" 
                  onClick={() => handleStatusUpdate('active')}
                >Activer</button>
                <button 
                  className="admin__btn-status admin__btn-status--banned" 
                  onClick={() => handleStatusUpdate('banned')}
                >Bannir</button>
              </div>
            </>
          ) : (
            <p className="admin__empty">S&apos;il vous plaît, sélectionnez un joueur pour le modifier</p>
          )}
        </div>
      </div>
      {feedback && (
        <p className={`admin__feedback admin__feedback--${feedback.type}`}>
          {feedback.message}
        </p>
      )}
    </section>
  );
}

function GlobalStatsSection({ stats }) {
  const rows = statsToDisplay(stats);

  return (
    <section className="admin__section" aria-labelledby="admin-stats-title">
      <h2 id="admin-stats-title" className="admin__section-title">
        Statistiques globales
      </h2>
      <dl className="admin__stats">
        {rows.map((row) => (
          <div className="admin__stat" key={row.key}>
            <dt className="admin__stat-label">{row.label}</dt>
            <dd className="admin__stat-value">{formatNumber(row.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function GameConfigCard({ game, config, configExposed }) {
  const initial = configForDisplay(config);
  const [probabilitiesText, setProbabilitiesText] = useState(initial.probabilitiesJson);
  const [multipliersText, setMultipliersText] = useState(initial.multipliersJson);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const built = buildGameConfig(probabilitiesText, multipliersText);
    if (!built.ok) {
      setFeedback({ type: 'error', message: built.error });
      return;
    }
    try {
      coreService.setGameConfig(game.id, built.config);
      setFeedback({
        type: 'success',
        message: `Configuration de « ${game.name} » enregistrée (mock Core).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur inconnue.',
      });
    }
  };

  return (
    <li className="admin__game">
      <div className="admin__game-head">
        <span className="admin__game-name">{game.name}</span>
        <code className="admin__game-id">{game.id}</code>
        {game.unlockLevel !== null && (
          <span className="admin__game-level">Niveau {formatNumber(game.unlockLevel)}</span>
        )}
      </div>

      <p className="admin__game-note">
        {configExposed
          ? 'Configuration actuelle chargée via le Core.'
          : 'Configuration actuelle non exposée par le Core (en attente G1).'}
      </p>

      <form className="admin__form" onSubmit={handleSubmit}>
        <label className="admin__field">
          <span className="admin__field-label">Probabilités (JSON)</span>
          <textarea
            className="admin__textarea"
            value={probabilitiesText}
            onChange={(event) => setProbabilitiesText(event.target.value)}
            rows={3}
            spellCheck={false}
          />
        </label>

        <label className="admin__field">
          <span className="admin__field-label">Multiplicateurs (JSON)</span>
          <textarea
            className="admin__textarea"
            value={multipliersText}
            onChange={(event) => setMultipliersText(event.target.value)}
            rows={3}
            spellCheck={false}
          />
        </label>

        <button type="submit" className="admin__submit">
          Enregistrer
        </button>

        {feedback && (
          <p
            className={
              feedback.type === 'success'
                ? 'admin__feedback admin__feedback--success'
                : 'admin__feedback admin__feedback--error'
            }
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        )}
      </form>
    </li>
  );
}

function Admin() {
  const { data, error, refresh } = useAdminData();

  let body;
  if (error) {
    body = (
      <div className="admin__error" role="alert">
        <p>{'Impossible de charger l’administration.'}</p>
        <p className="admin__error-detail">{error}</p>
        <button type="button" className="admin__retry" onClick={refresh}>
          Réessayer
        </button>
      </div>
    );
  } else if (!data) {
    body = <p className="admin__empty">{'Aucune donnée d’administration disponible.'}</p>;
  } else {
    body = (
      <>
        <GlobalSettingsSection />
        <BonusEventsSection />
        <ModerationSection />
        <GlobalStatsSection stats={data.stats} />

        <section className="admin__section" aria-labelledby="admin-config-title">
          <h2 id="admin-config-title" className="admin__section-title">
            Configuration des jeux
          </h2>
          <p className="admin__section-hint">
            Liste des jeux :{' '}
            {data.gamesSource === 'core' ? 'Core' : 'registre applicatif (fallback, attente G1)'} ·{' '}
            {data.games.length} {data.games.length > 1 ? 'jeux' : 'jeu'}
          </p>
          {data.games.length === 0 ? (
            <p className="admin__empty">Aucun jeu disponible.</p>
          ) : (
            <ul className="admin__games">
              {data.games.map((game) => (
                <GameConfigCard
                  key={game.id}
                  game={game}
                  config={data.configs[game.id]}
                  configExposed={data.configExposed}
                />
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <AdminLayout>
      <div className="page-admin">
        <div className="admin__topbar">
          <h1 className="admin__title">Administration</h1>
          <button type="button" className="admin__refresh" onClick={refresh}>
            Actualiser
          </button>
        </div>
        {body}
      </div>
    </AdminLayout>
  );
}

export default Admin;
