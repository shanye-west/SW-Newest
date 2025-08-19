# SW Monthly Golf - Mobile PWA

A mobile-first Progressive Web App for golf tournament management with offline scoring capabilities.

## Features

- **Mobile-First Design**: Optimized for mobile devices with safe-area handling
- **PWA Capabilities**: Installable on iOS/Android with offline support
- **Tournament Management**: Create and manage golf tournaments
- **Offline Scoring**: Score rounds offline with automatic sync when online
- **Handicap Calculations**: USGA-compliant handicap management
- **Multiple Game Types**: Support for Gross Total, Net Total, and Gross Skins
- **Real-time Updates**: Live scoring updates and leaderboards

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Prisma + SQLite
- **Offline Storage**: Dexie (IndexedDB)
- **PWA**: next-pwa
- **Testing**: Vitest + React Testing Library

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install required PWA package**:
   ```bash
   npm install next-pwa
   ```

3. **Install testing dependencies**:
   ```bash
   npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
   