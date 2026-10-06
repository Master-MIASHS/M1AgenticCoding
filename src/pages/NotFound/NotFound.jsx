// NotFound page (Groupe 4 - issue #146).
// Shown by App for any route that is not declared. Presentation only.
import './notfound.css';

function NotFound() {
  return (
    <div className="page-notfound">
      <h1 className="notfound__title">Page introuvable</h1>
      <p className="notfound__text">
        La page demandée n&apos;existe pas ou a été déplacée.
      </p>
      <a className="notfound__link" href="#/">
        Retour à l&apos;accueil
      </a>
    </div>
  );
}

export default NotFound;
