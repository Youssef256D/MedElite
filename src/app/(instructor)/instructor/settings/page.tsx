import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentSession } from "@/modules/auth/service";

export default async function InstructorSettingsPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Profile"
        title="Instructor identity and studio settings"
        description="This page surfaces the instructor profile and approval posture used across public course pages and the creator studio."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Account</h2>
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
          </dl>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Instructor profile</h2>
          <dl className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <div className="flex items-center justify-between gap-4">
              <dt>Title</dt>
              <dd>{session.user.instructorProfile?.title ?? "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Specialty</dt>
              <dd>{session.user.instructorProfile?.specialty ?? "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Approval</dt>
              <dd>{session.user.instructorProfile?.isApproved ? "Approved" : "Pending"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
