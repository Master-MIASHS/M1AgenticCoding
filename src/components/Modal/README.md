# Modal

```jsx
import Modal from '../../components/Modal/Modal.jsx';

<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmer">
  <p>Votre contenu ici.</p>
  <button type="button" onClick={confirm}>Confirmer</button>
</Modal>
```

Props : isOpen (boolean), onClose (fonction obligatoire), title (titre obligatoire),
children (contenu React), closeOnBackdrop (boolean, false par défaut).
Le parent contrôle l'ouverture et doit passer isOpen à false dans onClose.
Escape et le bouton de fermeture appellent onClose. Le dialog natif confine le
focus et le composant restaure le focus précédent à la fermeture.
Utiliser des boutons type="button" ; éviter form method="dialog" qui contourne
l'état contrôlé. Pour un focus initial particulier, utiliser autoFocus sur un
contrôle du contenu. Navigateurs modernes avec HTMLDialogElement requis.
Aucun service appelé ; hooks : useEffect, useRef, useId.
