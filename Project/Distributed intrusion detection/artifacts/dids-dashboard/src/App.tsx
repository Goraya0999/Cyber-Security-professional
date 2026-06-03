import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Logs from "@/pages/Logs";
import Alerts from "@/pages/Alerts";
import Analytics from "@/pages/Analytics";
import NetworkAnalysis from "@/pages/NetworkAnalysis";
import LiveTraffic from "@/pages/LiveTraffic";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no layout */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected dashboard routes */}
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/logs" component={Logs} />
              <Route path="/alerts" component={Alerts} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/network-analysis" component={NetworkAnalysis} />
              <Route path="/live-traffic" component={LiveTraffic} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
