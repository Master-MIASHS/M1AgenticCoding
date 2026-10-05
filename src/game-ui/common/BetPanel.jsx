import { useState } from "react";

export default function BetPanel({ balance, onPlay, disabled = false, minBet = 1, maxBet = 1000 }) {
  const [betInput, setBetInput] = useState(String(minBet));

  const effectiveMax = Math.min(maxBet, balance);
  const numericBet = Number(betInput);
  const isValidNumber = betInput !== "" && !Number.isNaN(numericBet);
  const canPlay = !disabled && isValidNumber && numericBet >= minBet && numericBet <= effectiveMax;

  const handleBetChange = (e) => {
    const raw = e.target.value;
    // Autorise un champ temporairement vide pendant la saisie
    if (raw === "" || /^[0-9]+$/.test(raw)) {
      setBetInput(raw);
    }
  };

  const handleBlur = () => {
    if (betInput === "" || Number.isNaN(numericBet)) {
      setBetInput(String(minBet));
      return;
    }
    const clamped = Math.min(Math.max(numericBet, minBet), effectiveMax);
    setBetInput(String(clamped));
  };

  const handlePlay = () => {
    if (canPlay) {
      onPlay(numericBet);
    }
  };

  return (
    <div className="bet-panel">
      <label className="bet-panel__label" htmlFor="bet-amount">
        Mise
      </label>
      <input
        id="bet-amount"
        type="number"
        className="bet-panel__input"
        value={betInput}
        min={minBet}
        max={effectiveMax}
        step={1}
        onChange={handleBetChange}
        onBlur={handleBlur}
        disabled={disabled}
      />
      <button
        type="button"
        className="bet-panel__play-button"
        onClick={handlePlay}
        disabled={!canPlay}
      >
        Jouer
      </button>
      {isValidNumber && numericBet > balance && (
        <p className="bet-panel__error">Solde insuffisant</p>
      )}
    </div>
  );
}
