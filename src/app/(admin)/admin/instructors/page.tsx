import { approveInstructorAction } from "@/modules/admin/actions";
import { getAdminInstructors } from "@/modules/admin/service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function AdminInstructorsPage() {
  const instructors = await getAdminInstructors();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Instructors"
        title="Instructor approval and oversight"
        description="Approve instructor access, review their studio footprint, and keep publishing rights controlled."
      />
      <div className="space-y-4">
        {instructors.map((instructor) => (
          <Card key={instructor.id} className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                  {instructor.firstName} {instructor.lastName}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {instructor.instructorProfile?.title ?? "Instructor"} · {instructor.instructorProfile?.specialty ?? "Specialty pending"}
                </p>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{instructor.courses.length} managed courses</p>
            </div>
            {!instructor.instructorProfile?.isApproved ? (
              <form action={approveInstructorAction.bind(null, instructor.id)}>
                <Button type="submit">Approve instructor</Button>
              </form>
            ) : (
              <p className="text-sm font-semibold text-[var(--color-brand)]">Approved</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
