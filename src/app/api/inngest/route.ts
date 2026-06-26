import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { parseCandidate } from "@/inngest/functions/parse-candidate";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [parseCandidate],
});
