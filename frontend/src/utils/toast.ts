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
      background: '#10b981', // green-500
      color: '#ffffff',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#10b981',
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
      background: '#ef4444', // red-500
      color: '#ffffff',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#ef4444',
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
      background: '#dc2626', // volcano-600
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
      background: '#f3f4f6', // gray-100
      color: '#1f2937', // gray-800
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
