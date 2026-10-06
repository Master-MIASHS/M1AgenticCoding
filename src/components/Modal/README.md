# Modal

```jsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Résultat"
  variant="success" footer={<button type="button" onClick={() => setOpen(false)}>Continuer</button>}>
  <p>Contenu du résultat.</p>
</Modal>
```

Importer Modal depuis `src/components/Modal/Modal.jsx`.
Props : `isOpen`, `title`, `children`, `onClose`, `footer` facultatif,
`variant` : neutral (défaut), success ou error ; `closeOnBackdrop` : false par défaut.
Le parent doit fermer la modale dans onClose. Sans callback valide, les demandes
fermeture sont ignorées. Escape et bouton demandent la fermeture. Le dialog natif
confine le focus ; il est restauré à la fermeture. Utiliser des boutons type="button"
et éviter form method="dialog", qui contourne l'état contrôlé.
Styles partagés : importer les variables du projet dans l'application.
