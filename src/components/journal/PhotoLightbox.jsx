import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function PhotoLightbox({ src, onClose }) {
  if (!src) return null;
  return createPortal(
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}
