"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { assertRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { candidates, candidateSkills, skills, jobs } from "@/lib/db/schema";
import {
  embedTexts,
  candidateProfileText,
  jobProfileText,
} from "@/lib/ai/embeddings";
import { CANDIDATE_MANAGER_ROLES } from "@/lib/candidates/constants";

export type BackfillResult = {
  ok?: boolean;
  error?: string;
  candidates?: number;
  jobs?: number;
};

/** Tạo embedding cho ứng viên/job đã có nhưng còn thiếu (chạy theo lô 50). */
export async function backfillEmbeddings(): Promise<BackfillResult> {
  await assertRole([...CANDIDATE_MANAGER_ROLES]);

  try {
    let candCount = 0;
    let jobCount = 0;

    // --- Ứng viên ready, chưa có embedding ---
    const cands = await db
      .select({
        id: candidates.id,
        summary: candidates.summary,
        desiredPosition: candidates.desiredPosition,
      })
      .from(candidates)
      .where(and(eq(candidates.status, "ready"), isNull(candidates.embedding)))
      .limit(50);

    if (cands.length) {
      const ids = cands.map((c) => c.id);
      const skillRows = await db
        .select({ candidateId: candidateSkills.candidateId, name: skills.name })
        .from(candidateSkills)
        .innerJoin(skills, eq(candidateSkills.skillId, skills.id))
        .where(inArray(candidateSkills.candidateId, ids));
      const sm = new Map<string, string[]>();
      for (const r of skillRows) {
        const a = sm.get(r.candidateId) ?? [];
        a.push(r.name);
        sm.set(r.candidateId, a);
      }

      const items = cands
        .map((c) => ({
          id: c.id,
          text: candidateProfileText({
            desiredPosition: c.desiredPosition,
            summary: c.summary,
            skills: sm.get(c.id) ?? [],
          }),
        }))
        .filter((x) => x.text.trim().length > 0);

      if (items.length) {
        const embs = await embedTexts(items.map((x) => x.text));
        for (let i = 0; i < items.length; i++) {
          await db
            .update(candidates)
            .set({ embedding: embs[i] })
            .where(eq(candidates.id, items[i].id));
        }
        candCount = items.length;
      }
    }

    // --- Job chưa có embedding ---
    const js = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        requiredSkills: jobs.requiredSkills,
        description: jobs.description,
      })
      .from(jobs)
      .where(isNull(jobs.embedding))
      .limit(50);

    if (js.length) {
      const texts = js.map((j) =>
        jobProfileText({
          title: j.title,
          requiredSkills: j.requiredSkills ?? [],
          description: j.description?.replace(/<[^>]*>/g, " "),
        }),
      );
      const embs = await embedTexts(texts);
      for (let i = 0; i < js.length; i++) {
        await db.update(jobs).set({ embedding: embs[i] }).where(eq(jobs.id, js[i].id));
      }
      jobCount = js.length;
    }

    revalidatePath("/candidates");
    revalidatePath("/jobs");
    return { ok: true, candidates: candCount, jobs: jobCount };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi tạo embedding" };
  }
}
