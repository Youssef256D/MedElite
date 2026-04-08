import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { getCourseAccessTypeLabel, getStudentYearLabel } from "@/modules/courses/constants";

type CourseCardProps = {
  course: {
    slug: string;
    title: string;
    shortDescription: string;
    accessType: "FREE" | "PAID";
    priceCents?: number | null;
    targetStudentYear: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5";
    instructor: {
      firstName: string;
      lastName: string;
      instructorProfile?: { specialty?: string | null } | null;
    } | null;
    _count?: {
      lessons: number;
      enrollments: number;
    };
    _stats?: {
      videos: number;
      averageVideoDurationSeconds: number | null;
    };
  };
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <Badge tone={course.accessType === "PAID" ? "brand" : "neutral"}>{getCourseAccessTypeLabel(course.accessType)}</Badge>
        <Badge>{getStudentYearLabel(course.targetStudentYear)}</Badge>
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{course.title}</h3>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">{course.shortDescription}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm text-[var(--color-text-muted)]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Instructor</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">
            {course.instructor?.firstName ?? "Unknown"} {course.instructor?.lastName ?? "Instructor"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Track</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">
            {course.instructor?.instructorProfile?.specialty ?? "Medical Education"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Lessons</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">{course._count?.lessons ?? 0}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Videos</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">{course._stats?.videos ?? 0}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Average length</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">
            {course._stats?.averageVideoDurationSeconds
              ? formatDuration(course._stats.averageVideoDurationSeconds)
              : "No timing yet"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Price</p>
          <p className="mt-1 font-medium text-[var(--color-text)]">
            {course.accessType === "FREE"
              ? "Free"
              : course.priceCents && course.priceCents > 0
                ? formatCurrency(course.priceCents)
                : "Pending price"}
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex items-center text-sm font-semibold text-[var(--color-brand)] transition hover:text-[var(--color-brand-strong)]"
        >
          View course
        </Link>
      </div>
    </Card>
  );
}
