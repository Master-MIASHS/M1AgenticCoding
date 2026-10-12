// Create-profile page (Groupe 4 - issue #277).
// Shown at first launch, when the Core state has no pseudo yet. It asks for the
// pseudo and birth date and hands them to the Core (`creerProfil`): validation and the
// decision to accept it stay in the Core, the page only displays the answer.
// The birth date is required here (surface check only); the 18-year minimum is
// enforced by the Core (G5 decision, discussion #6).

import { useState } from 'react';
import { creerProfil } from '../../services/coreService.js';
import { submitProfile } from './createProfile.utils.js';
import './createProfile.css';

function CreateProfile({ onCreated, onSkip, create = creerProfil }) {
  const [pseudo, setPseudo] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = submitProfile(pseudo, dateNaissance, create);
    if (result.ok) {
      setError(null);
      onCreated?.();
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="page-create-profile">
      <h1 className="create-profile__title">Bienvenue au Casino Fantôme</h1>
      <p className="create-profile__text">Choisis ton pseudo et indique ta date de naissance pour commencer à jouer (18 ans minimum).</p>
      <form className="create-profile__form" onSubmit={handleSubmit} noValidate>
        <label className="create-profile__label" htmlFor="create-profile-pseudo">
          Pseudo
        </label>
        <input
          id="create-profile-pseudo"
          className="create-profile__input"
          type="text"
          autoComplete="nickname"
          value={pseudo}
          onChange={(event) => setPseudo(event.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'create-profile-error' : undefined}
        />
        <label className="create-profile__label" htmlFor="create-profile-naissance">
          Date de naissance
        </label>
        <input
          id="create-profile-naissance"
          className="create-profile__input"
          type="date"
          autoComplete="bday"
          required
          value={dateNaissance}
          onChange={(event) => setDateNaissance(event.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'create-profile-error' : undefined}
        />
        {error && (
          <p id="create-profile-error" className="create-profile__error" role="alert">
            Impossible de créer le profil : {error}
          </p>
        )}
        <div className="create-profile__actions">
          <button type="submit" className="create-profile__submit">
            Créer mon profil
          </button>
          {onSkip && (
            <button type="button" className="create-profile__skip" onClick={onSkip}>
              Continuer sans profil
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

export default CreateProfile;
