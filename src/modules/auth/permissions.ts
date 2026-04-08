import type { Role, Tables } from "@/lib/database";

export const roleLabels: Record<Role, string> = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
};

export function isAdminRole(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isInstructorRole(role: Role) {
  return role === "INSTRUCTOR";
}

export function canAccessInstructorStudio(role: Role) {
  return isInstructorRole(role) || isAdminRole(role);
}

export function canManageCourse(
  user: Pick<Tables<"User">, "id" | "role">,
  course: Pick<Tables<"Course">, "instructorId">,
) {
  if (isAdminRole(user.role)) {
    return true;
  }

  return user.role === "INSTRUCTOR" && course.instructorId === user.id;
}

export function getRoleHome(role: Role) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "INSTRUCTOR") {
    return "/instructor/dashboard";
  }

  return "/student/dashboard";
}
