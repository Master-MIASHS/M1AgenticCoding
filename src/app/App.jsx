import MainLayout from '../layouts/MainLayout.jsx';
import { getState } from '../services/coreService.js';

// Minimal application shell (skeleton).
//
// Demonstrates the required access chain:
//   UI (App) -> coreService.js -> Core
// Implements no business feature.
function App() {
  const state = getState();

  return (
    <MainLayout>
      <h1>Casino Fantôme</h1>
      <p>Architecture skeleton - Core reachable via coreService.</p>
      <p>
        Balance: {state.balance} | Level: {state.level} | Role: {state.role}
      </p>
    </MainLayout>
  );
}

export default App;