import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar } from './Sidebar';
import { Toast } from '../ui/Toast';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineSync } from '../../hooks/useOffline';
import { Wifi, WifiOff } from 'lucide-react';


export function DashboardLayout() {
  const { isOnline } = useUIStore();
  const { isLoading } = useAuth();
  const { pendingCount } = useOfflineSync();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar />
        <main className="p-4 lg:p-6">
          {!isOnline && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
              <WifiOff className="w-4 h-4" />
              <span>You are offline. Actions will be synced when connection is restored.</span>
              {pendingCount > 0 && (
                <span className="font-medium">{pendingCount} pending</span>
              )}
            </div>
          )}
          {isOnline && pendingCount > 0 && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <Wifi className="w-4 h-4" />
              <span>Syncing {pendingCount} offline actions...</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  );
}
