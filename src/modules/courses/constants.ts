import type { CourseAccessType, EnrollmentStatus, PaymentMethod, StudentYear } from "@/lib/database";

export const studentYearOptions: StudentYear[] = ["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5"];
export const courseAccessTypeOptions: CourseAccessType[] = ["FREE", "PAID"];
export const paymentMethodOptions: PaymentMethod[] = ["VODAFONE_CASH", "INSTAPAY"];
export const visibleEnrollmentStatuses: EnrollmentStatus[] = ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"];

export function getStudentYearLabel(year?: StudentYear | null) {
  switch (year) {
    case "YEAR_1":
      return "Year 1";
    case "YEAR_2":
      return "Year 2";
    case "YEAR_3":
      return "Year 3";
    case "YEAR_4":
      return "Year 4";
    case "YEAR_5":
      return "Year 5";
    default:
      return "Not assigned";
  }
}

export function getCourseAccessTypeLabel(accessType?: CourseAccessType | null) {
  switch (accessType) {
    case "FREE":
      return "Free";
    case "PAID":
      return "Paid";
    default:
      return "Unknown";
  }
}

export function getPaymentMethodLabel(method?: PaymentMethod | null) {
  switch (method) {
    case "VODAFONE_CASH":
      return "Vodafone Cash";
    case "INSTAPAY":
      return "InstaPay";
    default:
      return "Not provided";
  }
}

export function getEnrollmentStatusLabel(status?: EnrollmentStatus | null) {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "REVOKED":
      return "Revoked";
    case "PAUSED":
      return "Paused";
    default:
      return "Unknown";
  }
}
