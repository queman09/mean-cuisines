import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/HomePage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import SuggestPage from "@/pages/SuggestPage";
import AgentPage from "@/pages/AgentPage";
import NotFound from "@/pages/not-found";

function AppRouter() {
  // Path-based routing so /privacy and /terms are real URLs.
  // Pair with vite.config.ts base: "/" — base: "./" breaks JS/CSS on nested paths.
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/suggest" component={SuggestPage} />
      <Route path="/agents" component={AgentPage} />
      <Route component={NotFound} />
    </Switch>
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
