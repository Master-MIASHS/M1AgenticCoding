import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import { getState } from '../services/coreService.js';
import Lobby from '../pages/Lobby/Lobby.jsx';
import Leaderboard from '../pages/Leaderboard/Leaderboard.jsx';
import Shop from '../pages/Shop/Shop.jsx';
import Statistics from '../pages/Statistics/Statistics.jsx';
import Profile from '../pages/Profile/Profile.jsx';
import Progression from '../pages/Progression/Progression.jsx';
import GamePage from '../pages/Game/GamePage.jsx';
import NotFound from '../pages/NotFound/NotFound.jsx';

// Temporary hash navigation supports GitHub Pages without server rewrites.
// Replace this adapter when the team chooses its routing library.
const getPath = () => window.location.hash.slice(1) || '/';
const GAME_PREFIX = '/game/';
const pages = {
  '/': Lobby,
  '/leaderboard': Leaderboard,
  '/shop': Shop,
  '/statistics': Statistics,
  '/profile': Profile,
  '/progression': Progression,
};

function App() {
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const player = getState();
  // Game screens remain outside the G4 shell; their bar will be added later.
  if (path.startsWith(GAME_PREFIX)) {
    return <GamePage gameId={path.slice(GAME_PREFIX.length).split('/')[0]} />;
  }

  const Page = pages[path] ?? NotFound;
  return (
    <MainLayout player={player} currentPath={path}>
      {path === '/history' ? (
        <section aria-labelledby="history-title">
          <h1 id="history-title">Mon historique</h1>
          <p>L’historique des parties sera disponible prochainement.</p>
        </section>
      ) : <Page />}
    </MainLayout>
  );
}
export default App;