import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/HomePage";
import ParallelCookPage from "@/pages/ParallelCookPage";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/parallel" component={ParallelCookPage} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  );
}
