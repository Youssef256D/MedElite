import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminAuditLogs } from "@/modules/admin/service";

export default async function AdminLogsPage() {
  const logs = await getAdminAuditLogs();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Audit logs"
        title="Platform audit trail"
        description="Critical user, access, upload, and moderation actions are logged for observability and support workflows."
      />
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id} className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)]">{log.action}</p>
            <p className="text-lg font-semibold text-[var(--color-text)]">{log.message}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {log.entityType} · {log.entityId}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">{log.createdAt.toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
