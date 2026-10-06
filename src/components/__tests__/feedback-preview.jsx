import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '../Modal/Modal.jsx';
import Notification from '../Notification/Notification.jsx';
import Loader from '../Loader/Loader.jsx';
import '../../styles/variables.css';
function Demo() {
  const [open, setOpen] = useState(false);
  const [backdrop, setBackdrop] = useState(false);
  const [notice, setNotice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(false);
  return (
    <main
      style={{ padding: 16, background: '#0f1115', color: '#e6e8ee', fontFamily: 'sans-serif' }}
    >
      <button id="trigger" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <label>
        <input
          id="backdrop"
          type="checkbox"
          checked={backdrop}
          onChange={(e) => setBackdrop(e.target.checked)}
        />
        Fermer au clic extérieur
      </label>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Confirmation"
        variant="success"
        closeOnBackdrop={backdrop}
        footer={
          <button id="last" type="button" onClick={() => setOpen(false)}>
            Confirmer
          </button>
        }
      >
        <input id="field" aria-label="Votre nom" />
      </Modal>
      {['info', 'success', 'warning', 'error'].map((type) => (
        <Notification key={type} type={type}>
          Message {type}
        </Notification>
      ))}
      {notice && <Notification onClose={() => setNotice(false)}>Fermeture test</Notification>}
      {['sm', 'md', 'lg'].map((size) => (
        <div key={size}>
          <Loader size={size} />
        </div>
      ))}
      <Loader showLabel={false} label="Chargement discret" />
      <button
        id="loading"
        onClick={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1500);
        }}
      >
        Charger
      </button>
      {loading && <Loader variant="overlay" />}
      <button id="auto" onClick={() => setAuto(true)}>
        Notification auto
      </button>
      {auto && (
        <Notification autoClose={1500} onClose={() => setAuto(false)}>
          Automatique
        </Notification>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
);
