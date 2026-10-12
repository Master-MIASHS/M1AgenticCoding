import { useCallback, useEffect, useState } from 'react';
import {
  getBalance,
  getShopCatalog,
  getShopInventory,
  purchaseShopItem,
} from '../../services/coreService.js';
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

const PURCHASE_STATUSES = new Set([
  'purchased',
  'already-owned',
  'unavailable',
  'insufficient-funds',
  'rejected',
]);

const PURCHASE_FALLBACK_MESSAGES = {
  purchased: 'Achat effectué.',
  'already-owned': 'Vous possédez déjà cet article.',
  unavailable: "Cet article n'est pas disponible à l'achat.",
  'insufficient-funds': 'Solde insuffisant pour acheter cet article.',
  rejected: "Cet article n'existe pas dans la boutique.",
};

const coreShopService = {
  getBalance,
  getShopCatalog,
  getShopInventory,
  purchaseShopItem,
};

function formatCredits(amount) {
  return Number.isFinite(amount) ? new Intl.NumberFormat('fr-FR').format(amount) : '—';
}

function readInventory(inventory) {
  if (
    inventory === null ||
    typeof inventory !== 'object' ||
    !Array.isArray(inventory.ownedItemIds) ||
    !inventory.ownedItemIds.every((itemId) => typeof itemId === 'string')
  ) {
    throw new Error('Inventaire de boutique invalide.');
  }

  return inventory.ownedItemIds;
}

export function getItemStatus(item, ownedItemIds) {
  if (!item?.available) return 'unavailable';
  return ownedItemIds.includes(item.id) ? 'owned' : 'available';
}

export function isPurchaseDisabled(status, purchasingItemId) {
  return status !== 'available' || purchasingItemId !== null;
}

export function readShopSnapshot(shopService) {
  const catalogue = shopService.getShopCatalog();
  const ownedItemIds = readInventory(shopService.getShopInventory());
  const balance = shopService.getBalance();

  if (!Array.isArray(catalogue) || !Number.isFinite(balance)) {
    throw new Error('Données de boutique invalides.');
  }

  return { catalogue, ownedItemIds, balance };
}

export function getPurchaseFeedback(result) {
  return typeof result.message === 'string'
    ? result.message
    : PURCHASE_FALLBACK_MESSAGES[result.status];
}

export function shouldRefreshPlayerSnapshot(result) {
  return result.status === 'purchased';
}

export async function requestPurchase(shopService, itemId) {
  const result = await shopService.purchaseShopItem(itemId);

  if (
    result === null ||
    typeof result !== 'object' ||
    !PURCHASE_STATUSES.has(result.status) ||
    result.itemId !== itemId ||
    !Number.isFinite(result.balance)
  ) {
    throw new Error("Réponse d'achat de la boutique invalide.");
  }

  return {
    result,
    ownedItemIds: readInventory(shopService.getShopInventory()),
  };
}

// `shopService` is injectable only for component tests and explicit previews.
// Production uses the Core public facade above.
function Shop({ shopService = coreShopService, onPlayerUpdated }) {
  const [catalogue, setCatalogue] = useState(null);
  const [ownedItemIds, setOwnedItemIds] = useState([]);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('Les achats utilisent des jetons fictifs.');
  const [purchasingItemId, setPurchasingItemId] = useState(null);

  const loadShop = useCallback(() => {
    setCatalogue(null);
    setOwnedItemIds([]);
    setBalance(null);
    setError('');

    try {
      const snapshot = readShopSnapshot(shopService);
      setCatalogue(snapshot.catalogue);
      setOwnedItemIds(snapshot.ownedItemIds);
      setBalance(snapshot.balance);
    } catch {
      setError('Impossible de charger la boutique. Réessayez dans un instant.');
    }
  }, [shopService]);

  useEffect(() => {
    const timerId = window.setTimeout(loadShop, 0);
    return () => window.clearTimeout(timerId);
  }, [loadShop]);

  async function handlePurchase(item) {
    if (purchasingItemId !== null) return;

    setPurchasingItemId(item.id);
    try {
      const { result, ownedItemIds: refreshedInventory } = await requestPurchase(
        shopService,
        item.id
      );
      setBalance(result.balance);
      setOwnedItemIds(refreshedInventory);
      setFeedback(getPurchaseFeedback(result));
      if (shouldRefreshPlayerSnapshot(result)) onPlayerUpdated?.();
    } catch {
      setError("L'achat n'a pas pu être enregistré. Réessayez dans un instant.");
    } finally {
      setPurchasingItemId(null);
    }
  }

  const isLoading = !error && catalogue === null;

  return (
    <section
      className="page-shop"
      aria-labelledby="shop-title"
      aria-busy={isLoading || purchasingItemId !== null}
    >
      <header className="shop-hero">
        <div>
          <p className="shop-hero__eyebrow">Casino Fantôme</p>
          <h1 id="shop-title">Boutique</h1>
          <p className="shop-hero__description">
            Personnalisez votre expérience avec des objets réservés aux habitués du casino.
          </p>
        </div>
        <div
          className="shop-balance"
          aria-label={
            balance === null
              ? error
                ? 'Solde indisponible'
                : 'Solde en cours de chargement'
              : `Solde : ${formatCredits(balance)} jetons`
          }
        >
          <span className="shop-balance__label">Votre solde</span>
          <strong className="shop-balance__amount">
            {balance === null ? (error ? '—' : '…') : `${formatCredits(balance)} jetons`}
          </strong>
        </div>
      </header>

      <p id="shop-feedback" className="shop-feedback" role="status" aria-live="polite">
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

      {isLoading ? (
        <div className="shop-state" role="status" aria-live="polite">
          Chargement du catalogue…
        </div>
      ) : null}

      {!error && catalogue?.length === 0 ? (
        <div className="shop-state" role="status" aria-live="polite">
          <p>Le catalogue est vide pour le moment.</p>
        </div>
      ) : null}

      {!error && catalogue?.length ? (
        <div className="shop-grid" aria-label="Catalogue de la boutique">
          {catalogue.map((item) => {
            const status = getItemStatus(item, ownedItemIds);
            const isPurchasingThisItem = purchasingItemId === item.id;
            const disabled = isPurchaseDisabled(status, purchasingItemId);

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
                    <button
                      type="button"
                      className="shop-button"
                      disabled={disabled}
                      aria-describedby="shop-feedback"
                      onClick={() => handlePurchase(item)}
                    >
                      {isPurchasingThisItem
                        ? 'Achat en cours…'
                        : status === 'owned'
                          ? 'Possédé'
                          : status === 'unavailable'
                            ? 'Indisponible'
                            : 'Acheter'}
                    </button>
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
