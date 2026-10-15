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
