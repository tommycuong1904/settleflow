function LoadingBar({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-full bg-[var(--surface-strong)] ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading workspace</span>

      <header className="space-y-4">
        <LoadingBar className="h-3 w-20" />
        <LoadingBar className="h-10 w-56 max-w-full" />
        <LoadingBar className="h-4 w-full max-w-2xl" />
      </header>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <LoadingBar className="h-3 w-20" />
            <LoadingBar className="h-7 w-full max-w-md" />
            <LoadingBar className="h-4 w-full max-w-xl" />
          </div>
          <LoadingBar className="h-10 w-32" />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <LoadingBar className="h-6 w-40" />
          <LoadingBar className="h-8 w-24" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <LoadingBar className="h-4 w-2/3" />
                <LoadingBar className="h-3 w-full max-w-lg" />
              </div>
              <LoadingBar className="h-9 w-28" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
