import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "./pages/admin-dashboard";
import PlayersPage from "./pages/players";
import CoursesPage from "./pages/courses";
import TournamentsPage from "./pages/tournaments";
import TournamentDetail from "./pages/tournament-detail";
import GroupScoring from "./pages/group-scoring";
import Leaderboards from "./pages/leaderboards";
import PublicResults from "./pages/public-results";
import PublicKiosk from "./pages/public-kiosk";
import AdminConflicts from "./pages/admin-conflicts";
import { CourseHolesPage } from "./pages/course-holes";
import AppHeader from "./components/AppHeader";
import { TournamentProvider } from "./contexts/TournamentContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/players" component={PlayersPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:id/holes" component={CourseHolesPage} />
      <Route path="/tournaments" component={TournamentsPage} />
      <Route path="/tournaments/:id" component={TournamentDetail} />
      <Route path="/tournaments/:tournamentId/score/:groupId" component={GroupScoring} />
      <Route path="/tournaments/:id/leaderboards" component={Leaderboards} />
      <Route path="/admin/conflicts" component={AdminConflicts} />
      <Route path="/public/:token" component={PublicResults} />
      <Route path="/public/:token/kiosk" component={PublicKiosk} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TournamentProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <AppHeader />
            <main 
              className="w-full"
              style={{
                paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))'
              }}
            >
              <Router />
            </main>
          </div>
          <Toaster />
        </TournamentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
