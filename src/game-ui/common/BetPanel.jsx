import { useState } from "react";

export default function BetPanel({ balance, onPlay, disabled = false, minBet = 1, maxBet = 1000 }) {
  const [bet, setBet] = useState(minBet);

  const handleBetChange = (e) => {
    const value = Number(e.target.value);
    setBet(Math.min(Math.max(value, minBet), maxBet));
  };

  const canPlay = !disabled && bet > 0 && bet <= balance;

  return (
    <div className="bet-panel">
      <label className="bet-panel__label" htmlFor="bet-amount">
        Mise
      </label>
      <input
        id="bet-amount"
        type="number"
        className="bet-panel__input"
        value={bet}
        min={minBet}
        max={Math.min(maxBet, balance)}
        step={1}
        onChange={handleBetChange}
        disabled={disabled}
      />
      <button
        type="button"
        className="bet-panel__play-button"
        onClick={() => onPlay(bet)}
        disabled={!canPlay}
      >
        Jouer
      </button>
      {bet > balance && (
        <p className="bet-panel__error">Solde insuffisant</p>
      )}
    </div>
  );
}
