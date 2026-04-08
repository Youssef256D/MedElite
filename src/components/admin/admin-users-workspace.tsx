import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import {
  approveInstructorAction,
  updateUserAccountAction,
  updateUserStatusAction,
} from "@/modules/admin/actions";
import { getAdminUsers } from "@/modules/admin/service";
import { roleLabels } from "@/modules/auth/permissions";
import { getStudentYearLabel, studentYearOptions } from "@/modules/courses/constants";

import { CreateManagedUserForm } from "./create-managed-user-form";

const selectClassName =
  "h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]";

const manageableRoleOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "ADMIN", label: "Admin" },
] as const;

const roleTabs = [
  { href: "/admin/users/students", label: "Students", role: "STUDENT" },
  { href: "/admin/users/instructors", label: "Instructors", role: "INSTRUCTOR" },
  { href: "/admin/users/admins", label: "Admins", role: "ADMIN" },
] as const;

type UsersWorkspaceRole = (typeof roleTabs)[number]["role"];

const workspaceCopy: Record<
  UsersWorkspaceRole,
  { title: string; description: string; empty: string }
> = {
  STUDENT: {
    title: "Student accounts",
    description: "Review students, adjust their assigned year, and keep course access aligned with their registration year.",
    empty: "No student accounts yet.",
  },
  INSTRUCTOR: {
    title: "Instructor accounts",
    description: "Review instructors, confirm their studio profile, and keep educator access organized in one place.",
    empty: "No instructor accounts yet.",
  },
  ADMIN: {
    title: "Admin accounts",
    description: "Keep admin access tight, visible, and easy to update without leaving the user workspace.",
    empty: "No admin accounts yet.",
  },
};

function getEditableRoleValue(role: keyof typeof roleLabels) {
  return role === "SUPER_ADMIN" ? "ADMIN" : role;
}

function getRoleLabel(role: keyof typeof roleLabels) {
  return roleLabels[role];
}

export async function AdminUsersWorkspace({ roleFilter }: { roleFilter: UsersWorkspaceRole }) {
  const users = await getAdminUsers({ role: roleFilter });
  const copy = workspaceCopy[roleFilter];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Users"
        title={copy.title}
        description={copy.description}
      />
      <div className="flex flex-wrap gap-2">
        {roleTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200",
              tab.role === roleFilter
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <details className="group">
        <Card className="space-y-0 p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[28px] px-6 py-5 marker:content-none">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Add account</h2>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">
                Click to open the user form and create a student, instructor, or admin account.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(35,96,93,0.18)]">
                Add account
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
            <CreateManagedUserForm />
          </div>
        </Card>
      </details>
      <div className="space-y-4">
        {users.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-[var(--color-text-muted)]">{copy.empty}</p>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {user.email} · {getRoleLabel(user.role)} · {user.status}
                    {user.studentYear ? ` · ${getStudentYearLabel(user.studentYear)}` : ""}
                  </p>
                  {roleFilter === "INSTRUCTOR" ? (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {user.instructorProfile?.title ?? "Instructor"} · {user.instructorProfile?.specialty ?? "Specialty pending"}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {roleFilter === "INSTRUCTOR"
                    ? `${user.coursesManagedCount} managed courses · ${user.sessions.length} active sessions`
                    : `${user.sessions.length} active sessions · ${user.devices.length} active devices`}
                </p>
              </div>
              <details className="group rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/35">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[24px] px-5 py-4 marker:content-none">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
                      Account controls
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Expand to edit access, student year, or moderation status.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-sm text-[var(--color-text-muted)] shadow-sm">
                      {getRoleLabel(user.role)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-sm text-[var(--color-text-muted)] shadow-sm">
                      {user.studentYear ? getStudentYearLabel(user.studentYear) : "No year"}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-text)] shadow-sm transition-transform duration-200 group-open:rotate-180">
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
                <div className="space-y-4 border-t border-[var(--color-border)] px-5 py-5">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <form action={updateUserAccountAction} className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-[var(--color-text)]">Access and year</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Choose the account role, and assign the student year when this is a student account.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--color-text)]">Role</span>
                          <select
                            name="role"
                            defaultValue={getEditableRoleValue(user.role)}
                            className={selectClassName}
                          >
                            {manageableRoleOptions.map((roleOption) => (
                              <option key={roleOption.value} value={roleOption.value}>
                                {roleOption.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--color-text)]">Student year</span>
                          <select
                            name="studentYear"
                            defaultValue={user.studentYear ?? ""}
                            className={selectClassName}
                          >
                            <option value="">No year assigned</option>
                            {studentYearOptions.map((year) => (
                              <option key={year} value={year}>
                                {getStudentYearLabel(year)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Latest subscription: {user.subscriptions[0]?.status ?? "None"}
                        </p>
                        <Button type="submit" variant="secondary">
                          Update account
                        </Button>
                      </div>
                    </form>

                    <form action={updateUserStatusAction} className="space-y-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-[var(--color-text)]">Moderation</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Suspend or ban the account when needed, with a reason stored in the audit trail.
                        </p>
                      </div>
                      <Input name="reason" placeholder="Reason for moderation change" />
                      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <select name="status" defaultValue={user.status} className={selectClassName}>
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="BANNED">Banned</option>
                        </select>
                        <Button type="submit">Save status</Button>
                      </div>
                    </form>
                  </div>

                  {roleFilter === "INSTRUCTOR" ? (
                    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-[var(--color-text)]">Studio approval</h3>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {user.instructorProfile?.isApproved
                              ? "This instructor is already approved for studio access."
                              : "Approve the instructor if they should be able to publish and manage courses."}
                          </p>
                        </div>
                        {user.instructorProfile?.isApproved ? (
                          <span className="rounded-full bg-[var(--color-brand-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-brand)]">
                            Approved
                          </span>
                        ) : (
                          <form action={approveInstructorAction.bind(null, user.id)}>
                            <Button type="submit" variant="secondary">
                              Approve instructor
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
