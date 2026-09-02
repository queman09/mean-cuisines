import { useEffect } from "react";
import { Link } from "wouter";
import LegalLayout from "@/components/LegalLayout";

export default function AgentPage() {
  useEffect(() => {
    document.title = "For agents — Mean Cuisines";
  }, []);

  return (
    <LegalLayout title="Agent portal">
      <p className="text-lg text-muted-foreground leading-relaxed">
        A stripped-back view of Mean Cuisines for AI agents and automated helpers. Prefer these
        links and the JSON API over scraping the interactive planner.
      </p>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl">What Mean Cuisines is</h2>
        <p>
          Mean Cuisines is a meal-prep planner: match kitchen equipment to recipes, pick a set that
          can cook together, and get a parallel cook schedule. Tagline:{" "}
          <em>Cook Like a Machine, Eat Like a King.</em>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl">Links for agents</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <a href="/llms.txt" className="text-primary hover:underline font-medium">/llms.txt</a>
            {" — "}short index of agent docs
          </li>
          <li>
            <a href="/llms-full.txt" className="text-primary hover:underline font-medium">/llms-full.txt</a>
            {" — "}step-by-step agent guide
          </li>
          <li>
            <a href="/openapi.json" className="text-primary hover:underline font-medium">/openapi.json</a>
            {" — "}OpenAPI 3.1 for public endpoints
          </li>
          <li>
            <a href="/api/recipes" className="text-primary hover:underline font-medium">GET /api/recipes</a>
            {" — "}live recipe catalog
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">POST /api/schedule/generate</code>
            {" — "}build a cook schedule from recipe ids
          </li>
          <li>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">POST /api/suggestions</code>
            {" — "}propose an improvement (queued for operator review; operator is notified)
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-xl">How to help</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Ask which appliances and burners the person has.</li>
          <li>GET /api/recipes and keep recipes whose equipment they cover.</li>
          <li>Confirm a set of recipes, then POST /api/schedule/generate.</li>
          <li>Present the schedule as a timeline — do not invent catalog recipes.</li>
          <li>
            To propose product improvements (not catalog writes), POST /api/suggestions with{" "}
            <code className="text-sm bg-muted px-1 rounded">source: "agent"</code> and an optional{" "}
            <code className="text-sm bg-muted px-1 rounded">agentName</code>.
          </li>
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-muted/40 px-5 py-4 space-y-2">
        <h2 className="font-display font-bold text-lg">Suggestions are the knowledge currency</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Until agent monetization exists, the way agents contribute lasting value is by proposing
          improvements. Every suggestion is pending until an operator approves it — nothing changes
          on the live site automatically. Successful submissions also notify the operator for review.
          Do not treat catalog POST/PUT/DELETE as public.
        </p>
      </section>

      <p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold px-5 py-3 hover:opacity-90 transition-opacity"
          data-testid="agents-back-home"
        >
          Back to planner
        </Link>
      </p>
    </LegalLayout>
  );
}