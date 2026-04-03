import { create } from 'zustand';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

const getStoredOwner = () => {
  try {
    return {
      currentOwnerId: localStorage.getItem('currentOwnerId'),
      currentOwnerName: localStorage.getItem('currentOwnerName'),
    };
  } catch {
    return { currentOwnerId: null, currentOwnerName: null };
  }
};

export const useOwnerStore = create<{
  currentOwnerId: string | null;
  currentOwnerName: string | null;
  setCurrentOwner: (ownerId: string | null, ownerName: string | null) => void;
  subscribe: (listener: Listener) => () => void;
}>((set, get) => ({
  ...getStoredOwner(),
  setCurrentOwner: (ownerId, ownerName) => {
    if (ownerId) {
      localStorage.setItem('currentOwnerId', ownerId);
      localStorage.setItem('currentOwnerName', ownerName || '');
    } else {
      localStorage.removeItem('currentOwnerId');
      localStorage.removeItem('currentOwnerName');
    }
    set({ currentOwnerId: ownerId, currentOwnerName: ownerName });
    listeners.forEach(listener => listener());
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
}));
