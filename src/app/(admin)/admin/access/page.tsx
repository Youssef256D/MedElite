import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { revokeUserSessionsAction } from "@/modules/admin/actions";
import { getAdminUsers } from "@/modules/admin/service";

export default async function AdminAccessPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Access control"
        title="Sessions, devices, and immediate containment"
        description="If a user is sharing access or showing suspicious behavior, admins can revoke sessions immediately."
      />
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {user.sessions.length} active sessions · {user.devices.length} active devices
                </p>
              </div>
              <form action={revokeUserSessionsAction.bind(null, user.id)}>
                <Button type="submit" variant="secondary">
                  Revoke sessions
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
