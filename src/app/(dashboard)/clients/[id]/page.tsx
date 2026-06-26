import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Mail, MapPin, Phone, UserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { clients, jobs, profiles } from "@/lib/db/schema";
import { CLIENT_MANAGER_ROLES, CLIENT_TYPE_LABEL } from "@/lib/clients/constants";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatDate, formatJobCode } from "@/lib/format";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole([...CLIENT_MANAGER_ROLES]);
  const { id } = await params;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      phone: clients.phone,
      email: clients.email,
      location: clients.location,
      note: clients.note,
      createdByName: profiles.fullName,
      createdByEmail: profiles.email,
    })
    .from(clients)
    .leftJoin(profiles, eq(clients.createdBy, profiles.id))
    .where(eq(clients.id, id))
    .limit(1);

  if (!client) notFound();

  const jobRows = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      title: jobs.title,
      status: jobs.status,
      headcount: jobs.headcount,
      location: jobs.location,
      remote: jobs.remote,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.clientId, id))
    .orderBy(desc(jobs.createdAt));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/clients">
          <ArrowLeft className="size-4" /> Đối tác
        </Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <Badge variant="secondary" className="font-normal">
            {CLIENT_TYPE_LABEL[client.type] ?? "Doanh nghiệp"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {client.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" /> {client.phone}
            </span>
          )}
          {client.email && (
            <span className="flex items-center gap-1">
              <Mail className="size-3.5" /> {client.email}
            </span>
          )}
          {client.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {client.location}
            </span>
          )}
          {(client.createdByName || client.createdByEmail) && (
            <span className="flex items-center gap-1">
              <UserRound className="size-3.5" /> Người phụ trách:{" "}
              <b className="font-medium text-foreground">
                {client.createdByName ?? client.createdByEmail}
              </b>
            </span>
          )}
        </div>
        {client.note && (
          <p className="mt-2 text-sm text-muted-foreground">{client.note}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vị trí tuyển dụng ({jobRows.length})</CardTitle>
          <CardDescription>Các vị trí đang gắn với đối tác này.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có vị trí nào cho đối tác này.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Địa điểm</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobRows.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                        <span className="text-primary">#{formatJobCode(j.code)}</span>{" "}
                        {j.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {j.remote ? "Remote" : j.location ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{j.headcount}</TableCell>
                    <TableCell>
                      <JobStatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(j.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
