import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentSession } from "@/modules/auth/service";

export default async function StudentAccountPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Account"
        title="Your account"
        description="View and manage your account details."
      />
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Profile</h2>
        <dl className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <div className="flex items-center justify-between gap-4">
            <dt>Name</dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {session.user.firstName} {session.user.lastName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Email</dt>
            <dd>{session.user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Role</dt>
            <dd>{session.user.role}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Status</dt>
            <dd>{session.user.status}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
