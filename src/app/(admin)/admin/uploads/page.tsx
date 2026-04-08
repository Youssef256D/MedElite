import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminUploadJobs } from "@/modules/admin/service";

export default async function AdminUploadsPage() {
  const uploadJobs = await getAdminUploadJobs();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Uploads"
        title="Upload pipeline monitoring"
        description="Track upload progress, queued processing, and final media readiness across the platform."
      />
      <div className="space-y-4">
        {uploadJobs.map((job) => (
          <Card key={job.id} className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{job.fileName}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {job.course?.title ?? "Unknown course"} · {job.lesson?.title ?? "Unknown lesson"} · {job.status}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
