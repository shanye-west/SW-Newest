# SW Monthly Golf PWA

A comprehensive mobile-first Progressive Web Application for golf tournament management with offline capabilities.

## Features

### Core Functionality
- **Player Management**: CRUD operations for players with mandatory Handicap Index (HI)
- **Course Management**: Golf course database with par, slope, rating for handicap calculations
- **Tournament Management**: Complete tournament lifecycle with entries, groups, and tee times
- **Manual Groups**: Create groups with optional tee times and assign players manually
- **Handicap Calculations**: USGA-compliant handicap calculations with proper rounding and capping

### Tournament Features
- Course Handicap (CH) calculation: `CH = round(HI * (slope/113) + (rating - par))`, capped at 18
- Playing Handicap with net allowance: `playingCH = round(CH * netAllowance/100)`
- Entry management with automatic handicap computation
- Group creation with per-group tee times
- Drag-and-drop style player assignment to groups

### Skins Payouts
- **Pot Configuration**: Set pot amount (in dollars) and number of participants in tournament settings
- **Payout Calculation**: Automatically calculates payout per skin as `pot ÷ total skins`
- **Zero Skins Handling**: Shows $0.00 payout when no skins are won yet
- **Real-time Updates**: Payout information updates live on admin leaderboards and public results
- **Public Display**: Share links show pot amount, total skins, and individual player payouts
- **Precision**: All calculations rounded to cents using standard banker's rounding

### Kiosk Mode
- **Public TV Display**: Large-format kiosk mode at `/public/{token}/kiosk` for TV screens
- **Auto-rotation**: Automatically cycles through Gross, Net, and Skins leaderboards every 8 seconds (configurable 5-20s)
- **Large Typography**: TV-optimized display with large fonts and clear positioning indicators
- **Live Updates**: Polls results every 10 seconds with visual change indicators (▲/▼)
- **Customizable Settings**: Configure sections, rotation timing, rows per page, theme via settings panel
- **Controls**: Press 'S' or long-press header (1.5s) to open settings
- **Fullscreen Support**: Fullscreen mode with Wake Lock API to prevent screen sleep
- **QR Sharing**: QR code modal for easy sharing of public results URL
- **Persistent Settings**: All preferences saved per tournament token in localStorage

### Technical Features
- Mobile-first responsive design
- Comprehensive error handling and validation
- Real-time data updates
- Proper TypeScript types throughout
- Unit tested handicap calculation engine (18 tests passing)

## Development

### Running the Application
```bash
npm run dev
```
This starts both the Express backend API server and Vite frontend development server on port 5000.

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npx vitest run __tests__/handicap.test.ts     # Handicap calculations (18 tests)
npx vitest run __tests__/payouts.test.ts      # Skins payout calculations (10 tests)
npx vitest run __tests__/sync.test.ts         # Offline sync functionality (8 tests)
npx vitest run __tests__/dexie-queue.test.ts  # Queue management (6 tests)
npx vitest run __tests__/kiosk-utils.test.ts  # Kiosk rotation utilities (10 tests)

# All tests should pass (52/52)
```

### Database
The application uses SQLite with Prisma ORM. Database includes:
- Players (with mandatory HI)
- Courses (par, slope, rating)
- Tournaments (with net allowance, passcode)  
- Entries (calculated CH, playing CH)
- Groups (with optional tee times)

## Tournament Workflow

1. **Setup**: Create courses and add players (HI required)
2. **Tournament Creation**: Choose course, set date, net allowance (default 100%), optional passcode
3. **Entries**: Add players to tournament - CH/playing CH calculated automatically
4. **Groups**: Create manual groups with optional tee times
5. **Assignment**: Assign entries to groups via dropdown selection

## API Endpoints

### Players
- `GET /api/players` - List all players
- `POST /api/players` - Create player (HI required)
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Courses  
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Tournaments
- `GET /api/tournaments` - List all tournaments
- `GET /api/tournaments/:id` - Get tournament details
- `POST /api/tournaments` - Create tournament
- `PUT /api/tournaments/:id` - Update tournament  
- `DELETE /api/tournaments/:id` - Delete tournament

### Entries
- `GET /api/tournaments/:id/entries` - List tournament entries
- `POST /api/tournaments/:id/entries` - Add entry (auto-calculates handicaps)
- `DELETE /api/entries/:id` - Remove entry
- `PUT /api/entries/:id/assign` - Assign entry to group

### Groups
- `GET /api/tournaments/:id/groups` - List tournament groups
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group (unassigns players)

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript  
- **Database**: SQLite + Prisma ORM
- **Testing**: Vitest for unit tests
- **Routing**: Wouter for client-side routing
- **State**: React Query for server state management

Built following mobile-first PWA principles with comprehensive admin functionality.

## Header Configuration

The app includes a global sticky header that's route-aware and tournament-aware. The header configuration is managed through `client/src/config/headerConfig.tsx`.

### Adding New Route Headers

To add header configuration for a new route:

```typescript
import { addHeaderConfig } from '@/config/headerConfig';
import { MyIcon } from 'lucide-react';

addHeaderConfig({
  pattern: '/my-route',  // or regex: /^\/my-route\/[^/]+$/
  title: 'My Page',
  actions: [{
    label: 'My Action',
    icon: <MyIcon className="w-5 h-5" />,
    testId: 'my-action',
    onClick: ({ location, setLocation, activeTournament }) => {
      // Handle action - has access to routing and tournament context
      setLocation('/target-route');
    }
  }]
});
```

### Header Features

- **Tournament Context**: Shows active tournament info when in tournament pages
- **Route-Aware Actions**: Different action buttons based on current route
- **Safe Area Support**: Proper padding for mobile notches and system UI
- **Back Navigation**: Contextual back button with smart routing
- **Overflow Menu**: Actions beyond 2 items go into kebab menu
- **Dark Mode**: Automatic dark mode support

### Route Patterns

- Static routes: `'/players'`, `'/courses'` 
- Dynamic routes: `/^\/tournaments\/[^/]+$/` for `/tournaments/:id`
- Pattern matching uses string equality or regex test