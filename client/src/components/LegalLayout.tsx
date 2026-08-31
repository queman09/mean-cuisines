import { Link } from "wouter";
import type { ReactNode } from "react";

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="hsl(20 90% 42%)" />
      <path d="M10 22 C10 16, 14 10, 16 10 C18 10, 22 16, 22 22" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 22 H24" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="8" r="2" fill="white" />
    </svg>
  );
}

export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Logo size={32} />
            <div>
              <p className="font-display font-bold text-base leading-tight">Mean Cuisines</p>
              <p className="text-xs text-muted-foreground">Cook Like a Machine. Eat Like a King.</p>
            </div>
          </Link>
          <Link href="/" className="ml-auto text-sm text-primary hover:underline">
            Back to planner
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-10">
        <article className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display font-bold text-3xl tracking-tight">{title}</h1>
          {children}
        </article>
      </main>

      <footer className="border-t border-border px-4 md:px-6 py-5">
        <div className="max-w-3xl mx-auto text-center text-xs text-muted-foreground space-y-2">
          <p className="font-display font-semibold text-sm text-foreground">Mean Cuisines</p>
          <p>
            <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            <span className="mx-2">·</span>
            <a href="/llms.txt" className="text-primary hover:underline">For agents</a>
          </p>
          <p className="text-muted-foreground/70">
            Mean Cuisines is a participant in the Amazon Services LLC Associates Program, an affiliate
            advertising program designed to provide a means for sites to earn advertising fees by
            advertising and linking to Amazon.com and affiliated sites.
          </p>
        </div>
      </footer>
    </div>
  );
}
