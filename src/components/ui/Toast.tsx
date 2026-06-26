import { useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toast() {
  const { toast, clearToast } = useUIStore();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[320px]', styles[toast.type])}>
        {icons[toast.type]}
        <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{toast.message}</p>
        <button onClick={clearToast} className="p-1 hover:bg-black/5 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
