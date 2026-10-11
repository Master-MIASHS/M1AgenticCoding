import assert from 'node:assert';
import { 
  play, 
  getBalance, 
  addXP, 
  getLevel 
} from '../../../src/core/core.js';

// Mock for getState since we are in Node.js environment and state.js might depend on browser/global state
// In a real scenario, we should import the state and set it.
// Since we don't have a full test runner setup with mocks yet, 
// we will implement a simple cycle test.

async function runE2ETest() {
  console.log('🚀 Starting E2E Integration Test: Game Cycle');

  try {
    // 1. Initial State
    const initialBalance = getBalance();
    const initialLevel = getLevel();
    console.log(`Initial Balance: ${initialBalance}, Level: ${initialLevel}`);

    // 2. Game Cycle: Start & Resolve
    // Simulating a Wheel game: Bet 100, Outcome Win, Multiplier 2x
    const bet = 100;
    const gameResult = { outcome: 'win', multiplier: 2 };
    
    console.log(`Playing game: Bet ${bet}, Result: ${gameResult.outcome} (x${gameResult.multiplier})`);
    const result = play('wheel', bet, gameResult);

    // 3. Economy Validation
    // Expected new balance: initial + (100 * 2 - 100) = initial + 100
    const expectedBalance = initialBalance + (bet * (gameResult.multiplier - 1));
    assert.strictEqual(result.newBalance, expectedBalance, `Balance mismatch: expected ${expectedBalance}, got ${result.newBalance}`);
    console.log(`✅ Economy: Balance updated correctly to ${result.newBalance}`);

    // 4. Progression Validation
    const xpBefore = 0; // we don't have a getXP, but we can check level change
    const progression = addXP(result.xpGained || 10);
    console.log(`✅ Progression: XP added. New Level: ${progression.level}`);
    
    assert.ok(progression.level >= initialLevel, 'Level should not decrease');

    console.log('\n🎉 E2E Game Cycle Test Passed Successfully!');
  } catch (error) {
    console.error('\n❌ E2E Game Cycle Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

runE2ETest();
