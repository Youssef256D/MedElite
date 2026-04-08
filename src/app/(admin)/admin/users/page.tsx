import type { Role } from "@/lib/database";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  createManagedUserAction,
  updateUserAccountAction,
  updateUserStatusAction,
} from "@/modules/admin/actions";
import { getAdminUsers } from "@/modules/admin/service";
import { roleLabels } from "@/modules/auth/permissions";
import { getStudentYearLabel, studentYearOptions } from "@/modules/courses/constants";

const selectClassName =
  "h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]";

const manageableRoleOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "ADMIN", label: "Admin" },
] as const;

function getEditableRoleValue(role: Role) {
  return role === "SUPER_ADMIN" ? "ADMIN" : role;
}

function getRoleLabel(role: Role) {
  return roleLabels[role];
}

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Users"
        title="Manage student and staff accounts"
        description="Create student, instructor, and admin accounts here, assign the right student year, and keep moderation controls in the same workspace."
      />
      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Add account</h2>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">
            Student year controls which course catalog the student sees. Instructor title and specialty are used only when creating instructor accounts.
          </p>
        </div>
        <form action={createManagedUserAction} className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">First name</span>
              <Input name="firstName" placeholder="First name" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Last name</span>
              <Input name="lastName" placeholder="Last name" required />
            </label>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Email</span>
              <Input name="email" type="email" placeholder="name@example.com" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Password</span>
              <Input name="password" type="password" placeholder="Create a password" required />
            </label>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Role</span>
              <select name="role" defaultValue="STUDENT" className={selectClassName}>
                {manageableRoleOptions.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Student year</span>
              <select name="studentYear" defaultValue="YEAR_1" className={selectClassName}>
                {studentYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {getStudentYearLabel(year)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Instructor title</span>
              <Input name="instructorTitle" placeholder="Instructor, Professor, Doctor..." />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Instructor specialty</span>
              <Input name="instructorSpecialty" placeholder="Medical Education" />
            </label>
          </div>
          <Button type="submit">Add account</Button>
        </form>
      </Card>
      <div className="space-y-4">
        {users.map((user) => (
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
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {user.sessions.length} active sessions · {user.devices.length} active devices
              </p>
            </div>
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
          </Card>
        ))}
      </div>
    </div>
  );
}
