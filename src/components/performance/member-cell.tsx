import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, isIntern } from "@/lib/performance/constants";

/** Ô "Thành viên": tên + email + badge vai trò (intern nổi bật riêng). */
export function MemberCell({
  name,
  email,
  role,
  rank,
}: {
  name: string;
  email: string;
  role: string;
  rank: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          <Badge variant={isIntern(role) ? "outline" : "secondary"} className="shrink-0">
            {ROLE_LABEL[role] ?? role}
          </Badge>
        </div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
    </div>
  );
}
