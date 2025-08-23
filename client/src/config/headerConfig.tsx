export interface HeaderConfig {
  pattern: string | RegExp;
  title: string;
}

export const headerConfig: HeaderConfig[] = [
  { pattern: '/', title: 'Dashboard' },
  { pattern: '/players', title: 'Players' },
  { pattern: '/courses', title: 'Courses' },
  { pattern: '/tournaments', title: 'Tournaments' },
  { pattern: /^\/tournaments\/[^/]+$/, title: 'Tournament' },
  { pattern: /^\/tournaments\/[^/]+\/groups$/, title: 'Groups' },
  { pattern: /^\/tournaments\/[^/]+\/score$/, title: 'Score' },
  { pattern: /^\/tournaments\/[^/]+\/leaderboards$/, title: 'Leaderboards' },
  { pattern: '/admin/conflicts', title: 'Conflicts Review' }
];

export function addHeaderConfig(config: HeaderConfig) {
  headerConfig.push(config);
}

export function updateHeaderConfig(pattern: string | RegExp, updates: Partial<HeaderConfig>) {
  const index = headerConfig.findIndex(config => {
    if (typeof pattern === 'string' && typeof config.pattern === 'string') {
      return config.pattern === pattern;
    }
    return config.pattern === pattern;
  });

  if (index !== -1) {
    headerConfig[index] = { ...headerConfig[index], ...updates };
  }
}

