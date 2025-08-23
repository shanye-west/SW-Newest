import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MobileLayout from '@/components/mobile-layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/hooks/use-tournament', () => ({
  useTournament: () => ({
    tournament: {
      name: 'Test Tournament',
      course: 'Test Course',
      date: 'Jan 1, 2024',
      playerCount: 10
    },
    recentActivity: [],
    offlineQueue: { count: 0, isVisible: false }
  })
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MobileLayout', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders with correct initial state', () => {
    renderWithQueryClient(
      <MobileLayout passcode="123456" isOrganizer={false} />
    );

    expect(screen.getByTestId('page-title')).toHaveTextContent('Home');
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument();
  });

  it('switches tabs correctly', () => {
    renderWithQueryClient(
      <MobileLayout passcode="123456" isOrganizer={false} />
    );

    // Click on Score tab
    fireEvent.click(screen.getByTestId('tab-score'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Score Card');

    // Click on Leaderboard tab
    fireEvent.click(screen.getByTestId('tab-leaderboard'));
    expect(screen.getByTestId('page-title')).toHaveTextContent('Leaderboard');
  });

  it('shows all navigation tabs', () => {
    renderWithQueryClient(
      <MobileLayout passcode="123456" isOrganizer={false} />
    );

    const expectedTabs = ['home', 'players', 'courses', 'tournaments', 'groups', 'score', 'leaderboard'];
    
    expectedTabs.forEach(tab => {
      expect(screen.getByTestId(`tab-${tab}`)).toBeInTheDocument();
    });
  });

  it('displays tournament information', () => {
    renderWithQueryClient(
      <MobileLayout passcode="123456" isOrganizer={false} />
    );

    expect(screen.getByTestId('text-tournament-name')).toHaveTextContent('Test Tournament');
    expect(screen.getByTestId('text-course-name')).toHaveTextContent('Test Course');
    expect(screen.getByTestId('text-tournament-date')).toHaveTextContent('Jan 1, 2024');
    expect(screen.getByTestId('text-player-count')).toHaveTextContent('10');
  });
});
