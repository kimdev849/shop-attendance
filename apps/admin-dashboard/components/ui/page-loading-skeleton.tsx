function PageLoadingSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-muted-foreground/10" />
        <div className="h-4 w-32 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-10 w-64 rounded-lg bg-muted-foreground/10" />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-muted-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 rounded bg-muted-foreground/10" />
                <div className="h-2.5 w-32 rounded bg-muted-foreground/10" />
              </div>
              <div className="h-6 w-16 rounded bg-muted-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { PageLoadingSkeleton };
