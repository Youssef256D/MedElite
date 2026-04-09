import { revalidatePath } from "next/cache";

export function revalidateAdminCourseWorkspacePaths() {
  revalidatePath("/admin/courses");
  revalidatePath("/admin/courses/all");
  revalidatePath("/admin/courses/course-approvals");
  revalidatePath("/admin/courses/payments");
  revalidatePath("/admin/courses/payment-approvals");
}

export function revalidateInstructorCoursePaths(courseId: string) {
  revalidatePath("/instructor/dashboard");
  revalidatePath("/instructor/courses");
  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath("/instructor/analytics");
}

export function revalidateStudentCoursePaths(courseSlug: string) {
  revalidatePath("/student/dashboard");
  revalidatePath("/student/courses");
  revalidatePath(`/student/course/${courseSlug}`);
}

export function revalidateEnrollmentWorkflowPaths(input: { courseId: string; courseSlug: string }) {
  revalidateAdminCourseWorkspacePaths();
  revalidatePath("/admin/dashboard");
  revalidateInstructorCoursePaths(input.courseId);
  revalidateStudentCoursePaths(input.courseSlug);
}
