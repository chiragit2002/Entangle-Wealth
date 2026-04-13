import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface PopupQueueContextValue {
  registerPopup: (id: string, priority: number) => void;
  unregisterPopup: (id: string) => void;
  isTopPopup: (id: string) => boolean;
}

const PopupQueueContext = createContext<PopupQueueContextValue>({
  registerPopup: () => {},
  unregisterPopup: () => {},
  isTopPopup: () => false,
});

interface PopupEntry {
  id: string;
  priority: number;
}

export function PopupQueueProvider({ children }: { children: ReactNode }) {
  const [popups, setPopups] = useState<PopupEntry[]>([]);

  const registerPopup = useCallback((id: string, priority: number) => {
    setPopups(prev => {
      const exists = prev.find(p => p.id === id);
      if (exists) return prev;
      return [...prev, { id, priority }].sort((a, b) => b.priority - a.priority);
    });
  }, []);

  const unregisterPopup = useCallback((id: string) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const isTopPopup = useCallback((id: string) => {
    return popups.length > 0 && popups[0].id === id;
  }, [popups]);

  return (
    <PopupQueueContext.Provider value={{ registerPopup, unregisterPopup, isTopPopup }}>
      {children}
    </PopupQueueContext.Provider>
  );
}

export function usePopupQueue(id: string, priority: number, active: boolean) {
  const { registerPopup, unregisterPopup, isTopPopup } = useContext(PopupQueueContext);

  useEffect(() => {
    if (active) {
      registerPopup(id, priority);
      return () => unregisterPopup(id);
    } else {
      unregisterPopup(id);
      return undefined;
    }
  }, [id, priority, active, registerPopup, unregisterPopup]);

  return isTopPopup(id);
}
