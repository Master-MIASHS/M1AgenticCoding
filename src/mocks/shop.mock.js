// Mock shop catalogue (development only).
//
// `availability` is a presentation snapshot while the Shop Core contract does
// not yet exist. It must be replaced by the catalogue and inventory supplied
// through coreService once that contract is available.
export const shopMock = {
  items: [
    {
      id: 'avatar_chapeau',
      name: 'Le Grand Chapeau',
      description: 'Un couvre-chef distingué pour votre profil de joueur.',
      category: 'avatars',
      price: 200,
      visual: '🎩',
      availability: 'available',
    },
    {
      id: 'theme_nuit',
      name: 'Nuit de velours',
      description: 'Un thème sombre aux reflets violets pour le casino.',
      category: 'thèmes',
      price: 500,
      visual: '🌙',
      availability: 'owned',
    },
    {
      id: 'effect_confettis',
      name: 'Pluie de confettis',
      description: 'Un effet visuel réservé aux joueurs expérimentés.',
      category: 'effets visuels',
      price: 750,
      visual: '🎉',
      availability: 'unavailable',
    },
    {
      id: 'badge_fidele',
      name: 'Habitué du Fantôme',
      description: 'Un badge qui signale votre fidélité à la table.',
      category: 'badges',
      price: 350,
      visual: '👻',
      availability: 'available',
    },
  ],
};

// Scenarios are consumed by Shop component tests through its `shopData` prop.
// They keep every temporary catalogue source in this single mock module.
export const shopMockScenarios = {
  empty: { items: [] },
  invalid: { items: null },
};

export default shopMock;
