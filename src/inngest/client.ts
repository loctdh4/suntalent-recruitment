import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "suntalent",
  // Dev: gửi event tới Inngest Dev Server (http://localhost:8288) — không cần event key.
  // Chạy kèm: `npx inngest-cli@latest dev`.
  isDev: process.env.NODE_ENV !== "production",
});

/** Tên sự kiện dùng chung. */
export const EVENTS = {
  candidateUploaded: "candidate/uploaded",
} as const;
