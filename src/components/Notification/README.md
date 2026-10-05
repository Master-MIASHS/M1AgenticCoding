# Notification

```jsx
import Notification from '../../components/Notification/Notification.jsx';

{message && <Notification type="success" onClose={() => setMessage(null)}>
  {message}
</Notification>}
```

Props : type (info par défaut, success, warning, error), children (contenu React),
onClose (fonction facultative ; sinon aucun bouton). Un type inconnu revient à info.
Le parent contrôle l'affichage et la durée : aucun timer ni gestionnaire global.
Erreur utilise role="alert" ; les autres types utilisent role="status".
Les libellés distinguent les types même sans couleur. Aucun hook ni appel service.
