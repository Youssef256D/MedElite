import { redirect } from "next/navigation";

export default function AdminInstructorsRedirectPage() {
  redirect("/admin/users/instructors");
}
