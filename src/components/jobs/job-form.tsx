"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { TagsInput } from "@/components/ui/tags-input";
import { LocationSelect } from "@/components/ui/location-select";
import { IndustrySelect } from "@/components/ui/industry-select";
import { ClientQuickAdd } from "@/components/clients/client-quick-add";
import { JdField } from "@/components/jobs/jd-field";
import { createJob, updateJob, type JobActionState } from "@/lib/jobs/actions";
import { JOB_PRIORITY_OPTIONS } from "@/lib/jobs/constants";

type ClientOption = { id: string; name: string };

export type JobFormValues = {
  id: string;
  title: string;
  clientId: string | null;
  location: string | null;
  remote: boolean;
  priority: string;
  minYears: number | null;
  headcount: number;
  contractValue: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredSkills: string[] | null;
  description: string | null;
  industry: string | null;
  jdUrl: string | null;
};

export function JobForm({
  clients,
  industries,
  job,
}: {
  clients: ClientOption[];
  industries: string[];
  job?: JobFormValues;
}) {
  const isEdit = !!job;
  const [clientOptions, setClientOptions] = useState<ClientOption[]>(clients);
  const [clientId, setClientId] = useState<string>(job?.clientId ?? "");
  const [remote, setRemote] = useState<string>(job?.remote ? "true" : "false");
  const [priority, setPriority] = useState<string>(job?.priority ?? "normal");
  // Thành công → server action redirect sang trang chi tiết.
  const [state, formAction, pending] = useActionState<JobActionState, FormData>(
    isEdit ? updateJob : createJob,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={job.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">Tên vị trí *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={job?.title}
          placeholder="VD: Trưởng phòng Kinh doanh"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Đối tác / khách hàng</Label>
        <input type="hidden" name="clientId" value={clientId} />
        <div className="flex items-center gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Chọn đối tác" />
            </SelectTrigger>
            <SelectContent>
              {clientOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Chưa có đối tác — bấm + để thêm
                </div>
              ) : (
                clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <ClientQuickAdd
            onCreated={(c) => {
              setClientOptions((prev) =>
                [...prev, c].sort((a, b) => a.name.localeCompare(b.name, "vi")),
              );
              setClientId(c.id);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="location">Địa điểm</Label>
          <LocationSelect id="location" name="location" defaultValue={job?.location} />
        </div>
        <div className="space-y-2">
          <Label>Hình thức</Label>
          <input type="hidden" name="remote" value={remote} />
          <Select value={remote} onValueChange={setRemote}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Onsite (theo địa điểm)</SelectItem>
              <SelectItem value="true">Remote (bỏ lọc địa điểm)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Ngành nghề</Label>
        <IndustrySelect
          id="industry"
          name="industry"
          options={industries}
          defaultValue={job?.industry}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="headcount">Số lượng</Label>
          <Input
            id="headcount"
            name="headcount"
            type="number"
            min={1}
            defaultValue={job?.headcount ?? 1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minYears">Số năm KN tối thiểu</Label>
          <Input
            id="minYears"
            name="minYears"
            type="number"
            min={0}
            defaultValue={job?.minYears ?? ""}
            placeholder="VD: 2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mức ưu tiên</Label>
        <input type="hidden" name="priority" value={priority} />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contractValue">Giá hợp đồng / vị trí (VND)</Label>
        <MoneyInput
          id="contractValue"
          name="contractValue"
          defaultValue={job?.contractValue ?? null}
          placeholder="VD: 30.000.000"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="salaryMin">Lương từ (VND)</Label>
          <MoneyInput
            id="salaryMin"
            name="salaryMin"
            defaultValue={job?.salaryMin ?? null}
            placeholder="20.000.000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryMax">Lương đến (VND)</Label>
          <MoneyInput
            id="salaryMax"
            name="salaryMax"
            defaultValue={job?.salaryMax ?? null}
            placeholder="35.000.000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requiredSkills">Kỹ năng yêu cầu</Label>
        <TagsInput
          id="requiredSkills"
          name="requiredSkills"
          defaultValue={job?.requiredSkills ?? []}
          placeholder="Nhập kỹ năng rồi nhấn Enter…"
        />
      </div>

      <div className="space-y-2">
        <Label>Mô tả công việc</Label>
        <RichTextEditor name="description" defaultValue={job?.description ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>File JD đính kèm</Label>
        <JdField defaultValue={job?.jdUrl} jobId={job?.id} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo vị trí"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={isEdit ? `/jobs/${job.id}` : "/jobs"}>Hủy</Link>
        </Button>
      </div>
    </form>
  );
}
