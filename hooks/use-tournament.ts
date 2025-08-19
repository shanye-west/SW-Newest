import { useState, useEffect } from 'react';
import { syncService } from '@/lib/sync';

interface Tournament {
  name: string;
  course: string;
  date: string;
  playerCount: number;
}

interface RecentActivity {
  player: string;
  action: string;
  time: string;
}

interface OfflineQueue {
  count: number;
  isVisible: boolean;
}

export function useTournament() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueue>({
    count: 0,
    isVisible: false
  });

  useEffect(() => {
    // Initialize tournament data (placeholder)
    setTournament({
      name: 'March Monthly Classic',
      course: 'Riverside Golf Club',
      date: 'Mar 15, 2024',
      playerCount: 24
    });

    // Initialize recent activity (placeholder)
    setRecentActivity([
      {
        player: 'John Smith',
        action: 'completed hole 9',
        time: '2m ago'
      },
      {
        player: 'Mike Johnson',
        action: 'scored eagle on hole 7',
        time: '5m ago'
      }
    ]);

    // Monitor offline queue status
    const checkOfflineStatus = async () => {
      try {
        const status = await syncService.getOfflineStatus();
        setOfflineQueue({
          count: status.queueCount,
          isVisible: status.hasOfflineData
        });
      } catch (error) {
        console.error('Failed to check offline status:', error);
      }
    };

    checkOfflineStatus();
    
    // Check offline status every 30 seconds
    const interval = setInterval(checkOfflineStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    tournament,
    recentActivity,
    offlineQueue
  };
}
