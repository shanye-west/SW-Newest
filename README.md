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
# Run handicap calculation tests
npx vitest run __tests__/handicap.test.ts

# All handicap tests should pass (18/18)
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