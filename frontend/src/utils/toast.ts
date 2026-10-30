import toast from 'react-hot-toast';

/**
 * Toast utility functions with volcano-themed styling
 * Using react-hot-toast for lightweight, accessible notifications
 */

/**
 * Show success toast (green, with checkmark)
 */
export const showSuccess = (message: string) => {
  return toast.success(message, {
    duration: 3000,
    style: {
      background: '#047857', // emerald-700 (white text ≥ 4.5:1)
      color: '#ffffff',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#047857',
    },
  });
};

/**
 * Show error toast (red, with X icon)
 */
export const showError = (message: string) => {
  return toast.error(message, {
    duration: 4000,
    style: {
      background: '#b91c1c', // red-700 (white text ≥ 4.5:1)
      color: '#ffffff',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#b91c1c',
    },
  });
};

/**
 * Show info toast (volcano theme, with info icon)
 */
export const showInfo = (message: string) => {
  return toast(message, {
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#b91c1c', // volcano-700 (white text ≥ 4.5:1)
      color: '#ffffff',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
  });
};

/**
 * Show loading toast (stays until dismissed)
 */
export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: 'rgb(var(--surface))',
      color: 'rgb(var(--ink))',
      border: '1px solid rgb(var(--line))',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
  });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};
