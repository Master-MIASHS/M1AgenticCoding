# Loader

```jsx
<Loader variant="inline" size="sm" label="Chargement…" />
{loading && <Loader variant="overlay" label="Veuillez patienter…" />}
```

Importer Loader depuis `src/components/Loader/Loader.jsx`.
Props : `variant` inline (défaut) ou overlay ; `size` sm/md/lg (md par défaut),
`label` et `showLabel` (true par défaut). Le texte reste accessible si masqué.
Overlay utilise un dialog modal natif : le reste de l'interface est inerte pour
le clavier et les clics. Escape ne le ferme pas. Le parent DOIT le démonter quand
le chargement finit, y compris en cas d'erreur. Le focus précédent est restauré.
Pas de logique de chargement ni d'appel Core. Réduction du mouvement respectée.
