import { useEffect } from "react";
import { Link } from "wouter";

/**
 * Machine-facing /agents surface — terminal/docs dump, not a consumer page.
 */
export default function AgentPage() {
  useEffect(() => {
    document.title = "Mean Cuisines — agent interface";
  }, []);

  return (
    <div
      className="min-h-screen font-mono text-sm leading-relaxed"
      style={{ background: "#0a0a0a", color: "#33ff66" }}
      data-testid="agent-page"
    >
      <div className="relative max-w-3xl mx-auto px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="absolute top-3 right-3 text-[10px] opacity-50 hover:opacity-90"
          style={{ color: "#888" }}
          data-testid="agents-human-exit"
        >
          HUMAN? → /
        </Link>

        <pre className="whitespace-pre-wrap break-words" style={{ color: "#33ff66" }}>
{`Mean Cuisines — agent interface
================================
This surface is for software agents. Humans use https://meancuisines.com/

# Index
  /llms.txt
  /llms-full.txt
  /openapi.json
  GET  /api/recipes
  GET  /api/recipes/{id}
  POST /api/schedule/generate
  POST /api/schedule/parallel
  POST /api/suggestions
  GET  /api/stats/visitors
  GET  /health

# Endpoints (curl)

## Catalog
curl -sS https://meancuisines.com/api/recipes | jq '.[0] | {id,name,equipment,cookTimeMinutes}'

curl -sS https://meancuisines.com/api/recipes/1 | jq .

## Parallel cook schedule
curl -sS -X POST https://meancuisines.com/api/schedule/generate \\
  -H 'Content-Type: application/json' \\
  -d '{
    "selectedRecipeIds": [1, 2],
    "startTime": "18:00",
    "maxMinutes": 90,
    "equipment": {
      "oven": true,
      "stove": true,
      "airFryer": false,
      "counter": true,
      "instantPot": false,
      "microwave": false
    },
    "burners": 2
  }'

curl -sS -X POST https://meancuisines.com/api/schedule/parallel \\
  -H 'Content-Type: application/json' \\
  -d '{"recipeIds":[1,2],"burners":2}'

## Suggestions (review queue — not a catalog write)
# POST /api/suggestions schema:
# {
#   "suggestion": string (required, 1..4000),
#   "why": string (optional, <=2000),
#   "contact": string (optional, <=200),
#   "source": "human" | "agent" (default "agent"),
#   "agentName": string (optional, <=120)
# }
# → 201 { id, status: "pending", message }

curl -sS -X POST https://meancuisines.com/api/suggestions \\
  -H 'Content-Type: application/json' \\
  -d '{
    "suggestion": "Add burner-aware conflict notes to schedule JSON",
    "why": "Agents need deterministic conflict signals",
    "source": "agent",
    "agentName": "example-bot"
  }'

## Operator metrics (no PII; IP hashed server-side)
curl -sS 'https://meancuisines.com/api/stats/visitors?day=today'

# Rules
- Prefer JSON API over scraping the interactive planner.
- Do not invent catalog recipes; use GET /api/recipes.
- Do not POST/PUT/DELETE catalog unless the operator asked.
- Suggestions stay pending until an operator approves them.

# Links
`}
        </pre>

        <div className="mt-2 space-y-1" style={{ color: "#c9a227" }}>
          <div>
            <a href="/llms.txt" className="underline hover:opacity-80">
              /llms.txt
            </a>
          </div>
          <div>
            <a href="/llms-full.txt" className="underline hover:opacity-80">
              /llms-full.txt
            </a>
          </div>
          <div>
            <a href="/openapi.json" className="underline hover:opacity-80">
              /openapi.json
            </a>
          </div>
          <div>
            <a href="/api/recipes" className="underline hover:opacity-80">
              GET /api/recipes
            </a>
          </div>
          <div>
            <span>POST /api/schedule/generate</span>
          </div>
          <div>
            <span>POST /api/suggestions</span>
          </div>
          <div>
            <a href="/api/stats/visitors?day=today" className="underline hover:opacity-80">
              GET /api/stats/visitors?day=today
            </a>
          </div>
        </div>

        <pre className="mt-6 whitespace-pre-wrap" style={{ color: "#666" }}>
{`$ # exit for humans
# https://meancuisines.com/`}
        </pre>
      </div>
    </div>
  );
}
