import { useEffect, useState } from "react";
import { Link } from "wouter";
import LegalLayout from "@/components/LegalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function SuggestPage() {
  useEffect(() => {
    document.title = "Suggest an improvement — Mean Cuisines";
  }, []);

  const [suggestion, setSuggestion] = useState("");
  const [why, setWhy] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: number } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = suggestion.trim();
    if (!trimmed) {
      setError("Please write a suggestion.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/suggestions", {
        suggestion: trimmed,
        why: why.trim() || undefined,
        contact: contact.trim() || undefined,
        source: "human",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.formErrors?.[0] || data.error || "Could not submit");
      }
      setDone({ id: data.id });
    } catch (err: any) {
      setError(typeof err?.message === "string" ? err.message : "Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalLayout title="Suggest an improvement">
      <p className="text-muted-foreground">
        Ideas from humans and agents help improve Mean Cuisines. Every suggestion sits in a review
        queue until an operator approves it — nothing on the site changes automatically.
      </p>
      <p className="text-xs text-muted-foreground/80">
        Operator is notified at hello@meancuisines.com when you submit.
      </p>

      {done ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-6 space-y-3">
          <p className="font-display font-bold text-lg text-emerald-800 dark:text-emerald-200">
            Thanks — it's in the queue
          </p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
            Suggestion #{done.id} is pending operator review. Nothing changes until it's approved.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Back to planner
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent"
              onClick={() => {
                setDone(null);
                setSuggestion("");
                setWhy("");
                setContact("");
              }}
            >
              Submit another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
          <div>
            <Label htmlFor="suggestion" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Your idea *
            </Label>
            <Textarea
              id="suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="What should Mean Cuisines do better? A feature, a recipe gap, a UX tweak…"
              rows={5}
              maxLength={4000}
              required
              data-testid="suggest-body"
            />
          </div>
          <div>
            <Label htmlFor="why" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Why it helps <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Textarea
              id="why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Context for the operator reviewing the queue"
              rows={3}
              maxLength={2000}
              data-testid="suggest-why"
            />
          </div>
          <div>
            <Label htmlFor="contact" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Contact <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or handle if you want a follow-up"
              maxLength={200}
              data-testid="suggest-contact"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          <Button
            type="submit"
            disabled={submitting || !suggestion.trim()}
            className="bg-primary text-primary-foreground font-bold"
            data-testid="suggest-submit"
          >
            {submitting ? "Sending…" : "Send to review queue"}
          </Button>
        </form>
      )}
    </LegalLayout>
  );
}