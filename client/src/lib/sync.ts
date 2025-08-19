/**
 * Sync status utilities for offline scoring
 */

export type SyncStatus = 'synced' | 'syncing' | 'offline';

/**
 * Derive sync status from current state
 */
export function deriveSyncStatus(params: {
  online: boolean;
  queueLength: number;
  isFlushing: boolean;
}): SyncStatus {
  const { online, queueLength, isFlushing } = params;
  
  if (!online) {
    return 'offline';
  }
  
  if (isFlushing || queueLength > 0) {
    return 'syncing';
  }
  
  return 'synced';
}

/**
 * Get display text for sync status
 */
export function getSyncStatusText(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'All changes synced';
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return 'Offline – will sync';
    default:
      return 'Unknown status';
  }
}

/**
 * Get CSS classes for sync status indicator
 */
export function getSyncStatusClasses(status: SyncStatus): string {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
  
  switch (status) {
    case 'synced':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
    case 'syncing':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`;
    case 'offline':
      return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`;
  }
}