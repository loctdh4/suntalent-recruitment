"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** YYYYMMDDTHHMMSSZ (UTC) cho ICS / Google Calendar. */
function toCalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function AddToCalendar({
  title,
  startISO,
  durationMinutes = 60,
  description = "",
  location = "",
  label = "Thêm vào lịch",
}: {
  title: string;
  startISO: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
  label?: string;
}) {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const dtStart = toCalUtc(start);
  const dtEnd = toCalUtc(end);

  const googleUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${dtStart}/${dtEnd}` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(location)}`;

  function downloadIcs() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SunTalent//Interview//VI",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${dtStart}-${Math.random().toString(36).slice(2)}@suntalent`,
      `DTSTAMP:${toCalUtc(new Date())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `LOCATION:${escapeIcs(location)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Nhắc phỏng vấn",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lich-phong-van.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPlus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-52 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        >
          <ExternalLink className="size-4" /> Google Calendar
        </a>
        <button
          type="button"
          onClick={downloadIcs}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
        >
          <Download className="size-4" /> Tải .ics (nhắc trước 30′)
        </button>
      </PopoverContent>
    </Popover>
  );
}
