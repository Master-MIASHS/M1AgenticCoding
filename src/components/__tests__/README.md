# Vérification des composants feedback

Tests de rendu : `node --test src/components/feedback.test.js`.

Démonstration isolée (aucune page métier modifiée) : lancer `npm run dev`, puis
ouvrir http://127.0.0.1:5173/src/components/__tests__/feedback.html.

## Tests navigateur reproductibles sous Windows

Dans un second terminal PowerShell, avec Node.js accessible :

```powershell
$feedbackProfile = Join-Path $env:TEMP 'casino-feedback-edge-validation'
Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList @('--headless=new', '--disable-gpu', '--remote-debugging-port=9223', ('--user-data-dir="' + $feedbackProfile + '"'), 'about:blank') -WindowStyle Hidden
Start-Sleep -Seconds 3
node src/components/__tests__/feedback.browser.mjs
```

Le script attend Vite sur 5173 et un navigateur de test dédié sur 9223 ; il ferme
ce navigateur à la fin. Pas de dépendance ajoutée. Node 22+ requis pour WebSocket.
Couverture : ouverture StrictMode, Tab/Shift+Tab, Escape, restauration du focus,
fermeture par bouton et fond optionnel, notification, autoClose, Loader overlay
non fermable par Escape, reduced-motion et largeurs 320/390/1280 px.
Le rendu SSR ne remplace pas ces contrôles ; l'appréciation visuelle humaine reste utile.
