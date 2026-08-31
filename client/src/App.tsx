import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/HomePage";
import ParallelCookPage from "@/pages/ParallelCookPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/not-found";

function AppRouter() {
  // Path-based routing (not hash). Required so /privacy and /terms are real URLs
  // for crawlers, Amazon Associates review, and the sitemap.
  // Pair this with vite.config.ts base: "/" — base: "./" breaks JS/CSS on nested paths.
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/parallel" component={ParallelCookPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
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
