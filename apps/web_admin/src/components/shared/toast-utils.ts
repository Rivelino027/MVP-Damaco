export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

type ToastListener = (type: ToastType, message: string) => void;
let addToastExternal: ToastListener | null = null;

export function registerToastListener(listener: ToastListener | null) {
  addToastExternal = listener;
}

export function toast(type: ToastType, message: string) {
  addToastExternal?.(type, message);
}

toast.success = (message: string) => addToastExternal?.('success', message);
toast.error = (message: string) => addToastExternal?.('error', message);
toast.warning = (message: string) => addToastExternal?.('warning', message);
toast.info = (message: string) => addToastExternal?.('info', message);

