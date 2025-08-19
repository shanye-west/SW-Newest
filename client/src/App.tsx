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

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/players" component={PlayersPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/tournaments" component={TournamentsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
