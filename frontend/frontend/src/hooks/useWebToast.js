import { toast } from 'sonner';

export const useWebToast = () => {
  const showToast = ({
    message = 'Something happened!',
    severity = 'info', // 'success' | 'error' | 'warning' | 'info'
    duration = 3000,
  }) => {
    toast[severity](message, {
      duration,
    });
  };

  return showToast;
};