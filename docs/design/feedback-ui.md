# G4 feedback UI

## Objectif
Fournir Modal, Notification et Loader réutilisables par G3 et G4.

## Périmètre
Composants de présentation seulement : aucune page, règle de jeu, API Core ou dépendance ajoutée.

## Conception
Modal contrôlée par isOpen/onClose, titre obligatoire et children libres. Utilisation du dialog natif : showModal fournit modalité, confinement du focus et Escape. Le composant restaure le focus à la fermeture. Fermeture par fond optionnelle, désactivée par défaut.
Notification contrôlée par le parent, type info/success/warning/error, children, onClose optionnel. Pas de minuterie implicite. role alert pour erreur, status sinon.
Loader avec label accessible, taille sm/md/lg et texte masquable. Animation désactivée en reduced-motion.
CSS préfixé et tokens existants avec replis. Aucun service et aucun état métier.

## Risques
Le dialog nécessite un navigateur moderne. Les interactions natives doivent être vérifiées dans un navigateur : une sortie SSR ne suffit pas à certifier focus et Escape.

## Plan de tests
node --test : rendu SSR via Vite, noms accessibles, types de notification, fermeture via callback, tailles et repli invalide du loader, modale fermée sans contenu visible. Avant création : composants absents ; après : succès.
Navigateur : ouverture, Tab/Shift+Tab, Escape, retour du focus, clic fond activé/désactivé, bouton fermeture, réduction du mouvement et largeur mobile.
Validation : npm run lint, npm test, npm run build. Comparer au baseline.

## Résultats de validation
Baseline : 18 tests réussis, lint sans erreur (4 avertissements Core), build réussi.
Après ajout : 23 tests réussis, mêmes avertissements, build réussi.
Relecture indépendante : isolation CSS du bouton Notification corrigée.
Les tests SSR ne valident pas les interactions natives du dialog. La checklist
navigateur (focus, Escape, fond, mobile) reste à exécuter avant validation finale.

