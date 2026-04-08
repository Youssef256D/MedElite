import { cn } from "@/lib/utils";

type PageLoadingShellProps = {
  className?: string;
  compact?: boolean;
};

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-3xl bg-[linear-gradient(90deg,rgba(231,224,210,0.72),rgba(255,255,255,0.94),rgba(231,224,210,0.72))] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function PublicPageLoadingShell({ className, compact = false }: PageLoadingShellProps) {
  return (
    <div className={cn("page-grid py-12 md:py-16", className)}>
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-12 w-full max-w-3xl" />
          <SkeletonBlock className="h-5 w-full max-w-2xl rounded-full" />
          {!compact ? <SkeletonBlock className="h-5 w-full max-w-xl rounded-full" /> : null}
        </div>
        <div className={cn("grid gap-5 md:grid-cols-3", compact && "md:grid-cols-2")}>
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
          {!compact ? <SkeletonBlock className="h-48" /> : null}
        </div>
      </div>
    </div>
  );
}

export function AuthPageLoadingShell() {
  return (
    <div className="page-grid grid min-h-screen items-center py-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden pr-8 lg:block">
        <div className="space-y-8">
          <SkeletonBlock className="h-10 w-40 rounded-full" />
          <div className="space-y-5">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <SkeletonBlock className="h-16 w-full max-w-xl" />
            <SkeletonBlock className="h-5 w-full max-w-lg rounded-full" />
            <SkeletonBlock className="h-5 w-full max-w-md rounded-full" />
          </div>
        </div>
      </div>
      <div className="surface-panel mx-auto w-full max-w-xl space-y-5 p-8 md:p-10">
        <SkeletonBlock className="h-6 w-40 rounded-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export function DashboardPageLoadingShell() {
  return (
    <div className="grid min-h-[420px] gap-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
      </div>
      <SkeletonBlock className="h-72" />
    </div>
  );
}
