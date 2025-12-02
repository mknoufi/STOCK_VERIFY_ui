import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';
import { toastService } from '../services/toastService';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; duration?: number }[]>([]);

  useEffect(() => {
    const handleShow = (toast: any) => {
      setToasts(prev => [...prev, toast]);
    };

    const handleHide = (data: { id?: string }) => {
      if (data.id) {
        setToasts(prev => prev.filter(t => t.id !== data.id));
      }
    };

    const handleClear = () => {
      setToasts([]);
    };

    toastService.on('show', handleShow);
    toastService.on('hide', handleHide);
    toastService.on('clear', handleClear);

    return () => {
      toastService.off('show', handleShow);
      toastService.off('hide', handleHide);
      toastService.off('clear', handleClear);
    };
  }, []);

  return (
    <>
      {children}
      <View style={[styles.container, { pointerEvents: 'box-none' as const }]}>
        {toasts.slice(-3).map((toast) => (
          <View key={toast.id} style={styles.toastWrapper}>
            <Toast
              visible={true}
              message={toast.message}
              type={toast.type as 'success' | 'error' | 'info' | 'warning'}
              onHide={() => toastService.hide(toast.id)}
            />
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 50,
  },
  toastWrapper: {
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 20,
  },
});
