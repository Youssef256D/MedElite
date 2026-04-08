import { UploadCenter } from "@/components/instructor/upload-center";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentSession } from "@/modules/auth/service";
import { getInstructorCourses } from "@/modules/courses/service";
import { getInstructorUploadJobs } from "@/modules/uploads/service";

export default async function InstructorUploadsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }
  const { courseId } = await searchParams;

  const [courses, uploadJobs] = await Promise.all([
    getInstructorCourses(session.user.id),
    getInstructorUploadJobs(session.user.id),
  ]);
  const uploadCourses = courses.map((course: (typeof courses)[number]) => ({
    id: course.id,
    title: course.title,
    lessonCount: course._count.lessons,
  }));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Upload center"
        title="Fast video delivery for new lessons"
        description="Pick a course, type the lesson name, and upload the video with live progress while the system prepares the lesson entry for you."
      />
      <UploadCenter courses={uploadCourses} initialCourseId={courseId} />
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Recent upload jobs</h2>
        <div className="space-y-3">
          {uploadJobs.map((job: (typeof uploadJobs)[number]) => (
            <div key={job.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-text)]">{job.fileName}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {job.course?.title ?? "Unknown course"} · {job.lesson?.title ?? "Unknown lesson"} · {job.status}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
