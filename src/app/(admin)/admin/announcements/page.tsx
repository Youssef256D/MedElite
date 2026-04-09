import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncementAction } from "@/modules/courses/actions";
import { getAdminCourses } from "@/modules/admin/service";
import { database, many } from "@/lib/database";

export default async function AdminAnnouncementsPage() {
  const [courses, announcements] = await Promise.all([
    getAdminCourses(),
    many(
      database.from("CourseAnnouncement").select("*").order("publishedAt", { ascending: false }).order("createdAt", { ascending: false }),
      "Announcements could not be loaded.",
    ),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Announcements"
        title="Admin-only course announcements"
        description="Announcements are managed here so instructors do not control student-wide course messaging directly."
      />

      <details className="group">
        <Card className="space-y-0 p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[28px] px-6 py-5 marker:content-none">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Create announcement</h2>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">
                Open the announcement composer only when you need it, and keep the page quieter the rest of the time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(35,96,93,0.18)]">
                Create announcement
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-sm transition-transform duration-200 group-open:rotate-180">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            </div>
          </summary>
          <div className="border-t border-[var(--color-border)] px-6 py-5">
            <form action={createAnnouncementAction} className="space-y-4">
              <select
                name="courseId"
                className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                required
              >
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <Input name="title" placeholder="Announcement title" required />
              <Textarea name="body" placeholder="Announcement body" required />
              <select
                name="publish"
                className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                defaultValue="true"
              >
                <option value="true">Publish now</option>
                <option value="false">Save as draft</option>
              </select>
              <Button type="submit">Save announcement</Button>
            </form>
          </div>
        </Card>
      </details>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description="Announcements created by admins will appear here." />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{announcement.title}</h2>
                <p className="text-sm font-semibold text-[var(--color-brand)]">{announcement.status}</p>
              </div>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">{announcement.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
