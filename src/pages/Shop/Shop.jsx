import { useCallback, useEffect, useState } from 'react';
import { getBalance } from '../../services/coreService.js';
import shopMock from '../../mocks/shop.mock.js';
import './Shop.css';

const STATUS_LABELS = {
  available: 'Disponible',
  owned: 'Déjà possédé',
  unavailable: 'Indisponible',
};

const STATUS_CLASSES = {
  available: 'shop-item__status--available',
  owned: 'shop-item__status--owned',
  unavailable: 'shop-item__status--unavailable',
};

function formatCredits(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

function getItemStatus(item) {
  return STATUS_LABELS[item.availability] ? item.availability : 'unavailable';
}

// Optional sources make the loading, empty and error states independently
// renderable in component tests. Production uses the mock and Core facade.
function Shop({ shopData = shopMock, balanceReader = getBalance }) {
  const [catalogue, setCatalogue] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(
    'Les achats seront disponibles lorsque le contrat Boutique du Core sera raccordé.',
  );

  const loadShop = useCallback(() => {
    setCatalogue(null);
    setError('');

    try {
      const items = shopData?.items;
      const currentBalance = balanceReader();

      if (!Array.isArray(items) || typeof currentBalance !== 'number') {
        throw new Error('Données de boutique invalides.');
      }

      setCatalogue(items);
      setBalance(currentBalance);
    } catch {
      setError('Impossible de charger la boutique. Réessayez dans un instant.');
    }
  }, [balanceReader, shopData]);

  useEffect(() => {
    // The mock is synchronous today, but the timeout keeps the same
    // asynchronous lifecycle as the future Core catalogue contract.
    const timerId = window.setTimeout(loadShop, 0);

    return () => window.clearTimeout(timerId);
  }, [loadShop]);

  function handlePurchase(item) {
    setFeedback(
      `L’achat de « ${item.name} » n’est pas encore disponible : le contrat d’achat du Core manque.`,
    );
  }

  return (
    <section className="page-shop" aria-labelledby="shop-title">
      <header className="shop-hero">
        <div>
          <p className="shop-hero__eyebrow">Casino Fantôme</p>
          <h1 id="shop-title">Boutique</h1>
          <p className="shop-hero__description">
            Personnalisez votre expérience avec des objets réservés aux habitués du casino.
          </p>
        </div>
        <div className="shop-balance" aria-label={balance === null ? 'Solde en cours de chargement' : `Solde : ${formatCredits(balance)} jetons`}>
          <span className="shop-balance__label">Votre solde</span>
          <strong className="shop-balance__amount">
            {balance === null ? '…' : `${formatCredits(balance)} jetons`}
          </strong>
        </div>
      </header>

      <p className="shop-feedback" role="status" aria-live="polite">
        {feedback}
      </p>

      {error ? (
        <div className="shop-state shop-state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="shop-button" onClick={loadShop}>
            Réessayer
          </button>
        </div>
      ) : null}

      {!error && catalogue === null ? (
        <div className="shop-state" role="status" aria-live="polite">
          Chargement du catalogue…
        </div>
      ) : null}

      {!error && catalogue?.length === 0 ? (
        <div className="shop-state">
          <p>Le catalogue est vide pour le moment.</p>
        </div>
      ) : null}

      {!error && catalogue?.length ? (
        <div className="shop-grid" aria-label="Catalogue de la boutique">
          {catalogue.map((item) => {
            const status = getItemStatus(item);
            const isPurchasable = status === 'available';

            return (
              <article className="shop-item" key={item.id}>
                <div className="shop-item__visual" aria-hidden="true">
                  {item.visual || '✦'}
                </div>
                <div className="shop-item__body">
                  <div className="shop-item__heading">
                    <p className="shop-item__category">{item.category || 'Article'}</p>
                    <span className={`shop-item__status ${STATUS_CLASSES[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <h2>{item.name}</h2>
                  <p className="shop-item__description">{item.description}</p>
                  <div className="shop-item__footer">
                    <span className="shop-item__price">{formatCredits(item.price)} jetons</span>
                    {isPurchasable ? (
                      <button
                        type="button"
                        className="shop-button"
                        onClick={() => handlePurchase(item)}
                      >
                        Acheter
                      </button>
                    ) : (
                      <button type="button" className="shop-button" disabled>
                        {status === 'owned' ? 'Possédé' : 'Indisponible'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default Shop;
