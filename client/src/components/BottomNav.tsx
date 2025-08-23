import { Home, Users, MapPin, Trophy } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/courses', label: 'Courses', icon: MapPin },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy }
];

export default function BottomNav() {
  const [location] = useLocation();

  if (location.startsWith('/public')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <ul className="flex justify-around items-center h-14">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location === item.href;
          const color = active
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-400';
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex flex-col items-center text-xs">
                <Icon className={cn('w-5 h-5 mb-1', color)} />
                <span className={color}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
