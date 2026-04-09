"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createManagedUserAction } from "@/modules/admin/actions";
import { getStudentYearLabel, studentYearOptions } from "@/modules/courses/constants";

const selectClassName =
  "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]";

const fieldClassName = "flex w-full flex-col gap-2";

const manageableRoleOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "ADMIN", label: "Admin" },
] as const;

type ManageableRole = (typeof manageableRoleOptions)[number]["value"];

export function CreateManagedUserForm() {
  const [role, setRole] = useState<ManageableRole>("STUDENT");

  return (
    <form action={createManagedUserAction} className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <label className={fieldClassName}>
          <span className="text-sm font-medium text-[var(--color-text)]">First name</span>
          <Input name="firstName" placeholder="First name" required />
        </label>
        <label className={fieldClassName}>
          <span className="text-sm font-medium text-[var(--color-text)]">Last name</span>
          <Input name="lastName" placeholder="Last name" required />
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <label className={fieldClassName}>
          <span className="text-sm font-medium text-[var(--color-text)]">Email</span>
          <Input name="email" type="email" placeholder="name@example.com" required />
        </label>
        <label className={fieldClassName}>
          <span className="text-sm font-medium text-[var(--color-text)]">Password</span>
          <Input name="password" type="password" placeholder="Create a password" required />
        </label>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <label className={fieldClassName}>
          <span className="text-sm font-medium text-[var(--color-text)]">Role</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as ManageableRole)}
            className={selectClassName}
          >
            {manageableRoleOptions.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
        </label>
        {role === "STUDENT" ? (
          <label className={fieldClassName}>
            <span className="text-sm font-medium text-[var(--color-text)]">Student year</span>
            <select name="studentYear" defaultValue="YEAR_1" className={selectClassName}>
              {studentYearOptions.map((year) => (
                <option key={year} value={year}>
                  {getStudentYearLabel(year)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden xl:block" aria-hidden="true" />
        )}
      </div>
      {role === "INSTRUCTOR" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={fieldClassName}>
            <span className="text-sm font-medium text-[var(--color-text)]">Instructor title</span>
            <Input name="instructorTitle" placeholder="Instructor, Professor, Doctor..." />
          </label>
          <label className={fieldClassName}>
            <span className="text-sm font-medium text-[var(--color-text)]">Instructor specialty</span>
            <Input name="instructorSpecialty" placeholder="Medical Education" />
          </label>
        </div>
      ) : null}
      <Button type="submit">Add account</Button>
    </form>
  );
}
