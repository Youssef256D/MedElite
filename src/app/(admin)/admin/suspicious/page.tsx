import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { resolveSuspiciousEventAction } from "@/modules/admin/actions";
import { getAdminSuspiciousEvents } from "@/modules/admin/service";

export default async function AdminSuspiciousPage() {
  const events = await getAdminSuspiciousEvents();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Suspicious activity"
        title="Review security and access anomalies"
        description="Events here are created by session-limit checks, concurrent playback patterns, and manual admin flags."
      />
      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{event.type}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{event.reason}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  {event.user?.email ?? "No user"} · severity {event.severity}
                </p>
              </div>
              {event.status !== "RESOLVED" ? (
                <form action={resolveSuspiciousEventAction.bind(null, event.id)}>
                  <Button type="submit" variant="secondary">
                    Resolve
                  </Button>
                </form>
              ) : (
                <p className="text-sm font-semibold text-[var(--color-brand)]">Resolved</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
