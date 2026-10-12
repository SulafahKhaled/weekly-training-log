import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const UndoContext = createContext({ showUndo: () => {} });

/** A bottom toast with a single Undo action, used after a timer is skipped. */
export function UndoProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showUndo = useCallback((message, onUndo, ms = 7000) => {
    clearTimeout(timer.current);
    setToast({ message, onUndo });
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <UndoContext.Provider value={{ showUndo, dismiss }}>
      {children}
      {toast &&
        createPortal(
          <div className="undo-toast" role="status">
            <span>{toast.message}</span>
            <button
              onClick={() => {
                toast.onUndo();
                dismiss();
              }}
            >
              Undo
            </button>
          </div>,
          document.body
        )}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);
