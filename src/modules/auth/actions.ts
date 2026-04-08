"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { isAppError, toErrorMessage } from "@/lib/errors";
import { StudentYear } from "@/lib/database";
import {
  authenticateWithPassword,
  getCurrentSession,
  getRoleHome,
  registerStudent,
  revokeSessionById,
  signOutCurrentSession,
} from "@/modules/auth/service";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  studentYear: z.nativeEnum(StudentYear),
});

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const payload = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const session = await authenticateWithPassword(payload.email, payload.password);
    redirect(getRoleHome(session.user.role));
  } catch (error) {
    unstable_rethrow(error);

    return {
      status: "error",
      message: isAppError(error) ? error.message : toErrorMessage(error),
    };
  }
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const payload = registerSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      studentYear: formData.get("studentYear"),
    });

    await registerStudent(payload);
    redirect("/student/dashboard");
  } catch (error) {
    unstable_rethrow(error);

    return {
      status: "error",
      message: isAppError(error) ? error.message : toErrorMessage(error),
    };
  }
}

export async function logoutAction() {
  await signOutCurrentSession();
  redirect("/");
}

export async function revokeOwnSessionAction(sessionId: string): Promise<void> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.id === sessionId) {
    await signOutCurrentSession();
    redirect("/login");
  }

  await revokeSessionById(sessionId, session.user.id, "Session revoked by account owner.");
  revalidatePath("/student/sessions");
}
