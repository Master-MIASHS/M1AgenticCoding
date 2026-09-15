// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------
// Declarative list of the application routes / pages.
//
// NOTE: the routing library and the GitHub Pages routing strategy are OPEN
// decisions (see README). This file only declares navigation data and does
// not depend on any router.
// ---------------------------------------------------------------------------

export const NAV_ITEMS = [
  { id: 'lobby', path: '/', label: 'Lobby' },
  { id: 'game', path: '/game/:gameId', label: 'Game' },
  { id: 'profile', path: '/profile', label: 'Profile' },
  { id: 'progression', path: '/progression', label: 'Progression' },
  { id: 'leaderboard', path: '/leaderboard', label: 'Leaderboard' },
  { id: 'shop', path: '/shop', label: 'Shop' },
  { id: 'statistics', path: '/statistics', label: 'Statistics' },
  { id: 'admin', path: '/admin', label: 'Admin' },
];

export const NOT_FOUND_PATH = '*';