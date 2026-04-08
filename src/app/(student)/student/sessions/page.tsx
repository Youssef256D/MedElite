import { revokeOwnSessionAction } from "@/modules/auth/actions";
import { getCurrentSession, getUserDevices, getUserSessions } from "@/modules/auth/service";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { formatDateTimeValue } from "@/lib/utils";

export default async function StudentSessionsPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const [sessions, devices] = await Promise.all([getUserSessions(session.user.id), getUserDevices(session.user.id)]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Sessions"
        title="Active sessions and devices"
        description="You can revoke older sessions at any time. Session and device limits are enforced on the server."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Sessions</h2>
          <div className="space-y-3">
            {sessions.map((item) => (
              <div key={item.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{item.device?.label ?? "Unknown device"}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.ipAddress ?? "Unknown IP"} · {item.status}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                      Last seen {formatDateTimeValue(item.lastSeenAt) ?? "Unknown"}
                    </p>
                  </div>
                  {item.id !== session.id ? (
                    <form action={revokeOwnSessionAction.bind(null, item.id)}>
                      <Button variant="secondary" size="sm" type="submit">
                        Revoke
                      </Button>
                    </form>
                  ) : (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand)]">Current</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Devices</h2>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                <p className="font-semibold text-[var(--color-text)]">{device.label}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{device.lastIpAddress ?? "Unknown IP"} · {device.status}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  Last seen {formatDateTimeValue(device.lastSeenAt) ?? "Unknown"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
