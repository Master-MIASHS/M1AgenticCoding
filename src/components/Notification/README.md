# Notification

```jsx
{message && <Notification type="success" autoClose={5000} onClose={() => setMessage(null)}>
  {message}
</Notification>}
```

Importer Notification depuis `src/components/Notification/Notification.jsx`.
Props : `type` info/success/warning/error, `children`, `onClose` facultatif,
`autoClose` false par défaut ou durée positive en millisecondes (maximum 2147483647).
Une durée invalide désactive le timer. Sans onClose valide, ni timer ni bouton.
La fermeture reste contrôlée par le parent. Changer la durée relance le timer ;
changer l'identité du callback ne le relance pas. Pour un nouveau message, changer
la key pour obtenir une nouvelle durée complète. Timer annulé au démontage.
Ne pas activer autoClose pour un message nécessitant une lecture ou une action
sans limite de temps. Erreur : role alert ; autres types : role status.
