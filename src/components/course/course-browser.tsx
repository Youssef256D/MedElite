"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/utils";
import {
  getCourseAccessTypeLabel,
  getStudentYearLabel,
} from "@/modules/courses/constants";

type BrowseCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  accessType: "FREE" | "PAID";
  priceCents: number | null;
  targetStudentYear: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5";
  instructor: {
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    lessons: number;
  };
  _stats?: {
    videos: number;
    averageVideoDurationSeconds: number | null;
  };
};

type CourseBrowserProps = {
  courses: BrowseCourse[];
};

const COURSES_PER_PAGE = 6;

export function CourseBrowser({ courses }: CourseBrowserProps) {
  const [activeType, setActiveType] = useState<"all" | "FREE" | "PAID">("all");
  const [page, setPage] = useState(0);

  const filtered =
    activeType === "all"
      ? courses
      : courses.filter((course) => course.accessType === activeType);

  const totalPages = Math.ceil(filtered.length / COURSES_PER_PAGE);
  const paginated = filtered.slice(page * COURSES_PER_PAGE, (page + 1) * COURSES_PER_PAGE);

  function handleTypeChange(type: "all" | "FREE" | "PAID") {
    setActiveType(type);
    setPage(0);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "FREE", "PAID"] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              activeType === type
                ? "bg-[var(--color-brand)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)]"
            }`}
          >
            {type === "all" ? "All" : getCourseAccessTypeLabel(type)}
          </button>
        ))}
      </div>

      {paginated.length === 0 ? (
        <div className="rounded-[28px] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No courses match this filter yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginated.map((course) => {
            const instructorName = course.instructor
              ? `${course.instructor.firstName} ${course.instructor.lastName}`
              : "Unknown instructor";
            const imageUrl = course.coverImageUrl || course.thumbnailUrl;

            return (
              <Link key={course.id} href={`/student/course/${course.slug}`} className="block">
                <Card className="group flex h-full flex-col gap-0 overflow-hidden p-0 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg">
                  <div className="relative h-40 w-full overflow-hidden bg-[var(--color-surface)]">
                    {imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-surface)]">
                        <BookOpen className="h-10 w-10 text-[var(--color-brand)]/40" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-brand)] backdrop-blur">
                        {getStudentYearLabel(course.targetStudentYear)}
                      </span>
                      <span className="rounded-full bg-[var(--color-text)]/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {getCourseAccessTypeLabel(course.accessType)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-snug text-[var(--color-text)] transition-colors group-hover:text-[var(--color-brand)]">
                        {course.title}
                      </h3>
                      <span className="shrink-0 text-sm font-semibold text-[var(--color-brand)]">
                        {course.accessType === "FREE"
                          ? "Free"
                          : course.priceCents && course.priceCents > 0
                            ? formatCurrency(course.priceCents)
                            : "Pending price"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
                      {course.shortDescription}
                    </p>
                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)]">
                      <span>{course._stats?.videos ?? 0} videos</span>
                      <span>{course._count?.lessons ?? 0} lessons</span>
                      <span>{instructorName}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {course._stats?.averageVideoDurationSeconds
                          ? formatDuration(course._stats.averageVideoDurationSeconds)
                          : "No timing yet"}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-strong)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setPage(index)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                  page === index
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page === totalPages - 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-strong)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
