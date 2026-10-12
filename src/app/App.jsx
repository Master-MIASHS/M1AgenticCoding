import { useCallback, useEffect, useState } from 'react';
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
import History from '../pages/History/History.jsx';
import Admin from '../pages/Admin/Admin.jsx';
import CreateProfile from '../pages/CreateProfile/CreateProfile.jsx';

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
  '/history': History,
  '/admin': Admin,
};

function App() {
  const [path, setPath] = useState(getPath);
  // `getState()` returns a snapshot. Advance this version after a Core mutation
  // so the shared shell (including Navbar) reads the current player again.
  const [, setPlayerVersion] = useState(0);
  const [profileSkipped, setProfileSkipped] = useState(false);
  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshPlayer = useCallback(() => setPlayerVersion((version) => version + 1), []);
  const player = getState();
  // First launch: no pseudo in the Core state yet, so ask for one. Skipping only
  // lasts for the session (the Core refuses a profile on a state already played).
  if (player?.pseudo === undefined && !profileSkipped) {
    return <CreateProfile onCreated={refreshPlayer} onSkip={() => setProfileSkipped(true)} />;
  }
  if (path.startsWith(GAME_PREFIX)) {
    return (
      <MainLayout player={player} currentPath={path}>
        <GamePage
          gameId={path.slice(GAME_PREFIX.length).split('/')[0]}
          onPlayerUpdated={refreshPlayer}
        />
      </MainLayout>
    );
  }

  // Display only: the Core refuses any admin action from a non-admin (rule 5).
  const Page = path === '/admin' && player?.role !== 'admin' ? NotFound : (pages[path] ?? NotFound);
  return (
    <MainLayout player={player} currentPath={path}>
      <Page
        {...(path === '/shop' || path === '/profile' ? { onPlayerUpdated: refreshPlayer } : {})}
      />
    </MainLayout>
  );
}
export default App;
