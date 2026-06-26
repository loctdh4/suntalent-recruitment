import { inngest, EVENTS } from "../client";
import { processCandidate, markCandidateError } from "@/lib/candidates/process";

/**
 * Job nền xử lý CV sau khi upload. Logic dùng chung ở lib/candidates/process.ts
 * (cũng được gọi inline khi không có Inngest dev server).
 */
export const parseCandidate = inngest.createFunction(
  {
    id: "parse-candidate",
    retries: 1,
    triggers: [{ event: EVENTS.candidateUploaded }],
    onFailure: async ({ event }) => {
      const candidateId = event.data.event.data.candidateId as string;
      await markCandidateError(candidateId);
    },
  },
  async ({ event, step }) => {
    const { candidateId, fileKey } = event.data as {
      candidateId: string;
      fileKey: string;
    };
    await step.run("process", () => processCandidate(candidateId, fileKey));
    return { candidateId, status: "ready" };
  },
);
