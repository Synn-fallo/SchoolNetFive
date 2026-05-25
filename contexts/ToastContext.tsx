import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastType } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: () => void;
  visible: boolean;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');

  const showToast = useCallback((newMessage: string, newType: ToastType, duration?: number) => {
    setMessage(newMessage);
    setType(newType);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
    // Réinitialiser après l'animation
    setTimeout(() => {
      setMessage('');
    }, 300);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        visible,
        message,
        type,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}