// Explicit fixtures for Shop tests and local previews only.
// Production Shop reads the public Core API through coreService.

export const shopPreviewCatalog = [
  {
    id: 'avatar_chapeau',
    name: 'Le Grand Chapeau',
    description: 'Un couvre-chef distingué pour votre profil de joueur.',
    category: 'avatars',
    price: 200,
    visual: '🎩',
    available: true,
  },
  {
    id: 'theme_nuit',
    name: 'Nuit de velours',
    description: 'Un thème sombre aux reflets violets pour le casino.',
    category: 'thèmes',
    price: 500,
    visual: '🌙',
    available: true,
  },
  {
    id: 'effect_confettis',
    name: 'Pluie de confettis',
    description: 'Un effet visuel réservé aux joueurs expérimentés.',
    category: 'effets visuels',
    price: 750,
    visual: '🎉',
    available: false,
  },
];

export const shopPreviewScenarios = {
  empty: {
    catalogue: [],
    inventory: { ownedItemIds: [] },
    balance: 1000,
  },
  owned: {
    catalogue: shopPreviewCatalog,
    inventory: { ownedItemIds: ['avatar_chapeau'] },
    balance: 800,
  },
};
