import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { requireBusinessAccess } from "../subscription/middleware.js";
import {
  listMeetingNotes,
  getMeetingNoteById,
  getMeetingNoteByShareToken,
  createMeetingNote,
  updateMeetingNote,
  setShareToken,
  deleteMeetingNote
} from "./repository.js";
import { renderMeetingNoteToDocx } from "./docx-converter.js";
import { summarizeMeetingNote } from "./summarize.js";
import { AppError } from "../../lib/errors/app-error.js";

export const meetingsRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(50_000).default(""),
  rawTranscript: z.string().max(100_000).nullish(),
  templateId: z.string().max(50).nullish(),
  eventId: z.string().max(200).nullish()
});

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().max(50_000).optional(),
  rawTranscript: z.string().max(100_000).nullish(),
  status: z.enum(["draft", "done"]).optional()
});

// GET /business/meetings — 목록
meetingsRouter.get("/", requireAuth, async (req, res) => {
  // 파싱 hardening — NaN / 음수 / 너무 큰 값 모두 안전한 기본값으로 클램프.
  const rawLimit = Number(req.query["limit"]);
  const rawOffset = Number(req.query["offset"]);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 20;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  const notes = await listMeetingNotes(req.authUser!.id, limit, offset);
  res.json(notes.map(n => ({
    id: n.id,
    title: n.title,
    status: n.status,
    createdAt: n.createdAt
  })));
});

// POST /business/meetings — 새 회의록 생성 (Business 전용)
meetingsRouter.post("/", requireAuth, requireBusinessAccess, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }

  const note = await createMeetingNote({
    userId: req.authUser!.id,
    title: parsed.data.title,
    body: parsed.data.body,
    rawTranscript: parsed.data.rawTranscript ?? null,
    templateId: parsed.data.templateId ?? null,
    eventId: parsed.data.eventId ?? null
  });

  res.status(201).json(note);
});

// GET /business/meetings/share/:token — 공개 공유 페이지용 (인증 불필요)
meetingsRouter.get("/share/:token", async (req, res) => {
  const note = await getMeetingNoteByShareToken(req.params["token"] as string);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    id: note.id,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt
  });
});

// GET /business/meetings/:id
meetingsRouter.get("/:id", requireAuth, async (req, res) => {
  const note = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(note);
});

// PATCH /business/meetings/:id
meetingsRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }

  // 동시 편집 감지 — frontend가 If-Match에 자기가 받은 updated_at을 ISO로 보냄.
  // DB의 현재 updated_at과 다르면 다른 곳에서 먼저 저장됐다는 뜻 → 412 + 현재 버전 반환.
  // 헤더 미제공 시 기존 last-write-wins (backward compat).
  const ifMatch = (req.header("if-match") ?? "").trim();
  if (ifMatch) {
    const current = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
    if (!current) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (current.updatedAt.toISOString() !== ifMatch) {
      res.status(412).json({
        error: "precondition_failed",
        message: "Note was modified elsewhere.",
        current,
      });
      return;
    }
  }

  const updated = await updateMeetingNote(req.params["id"] as string, req.authUser!.id, {
    title: parsed.data.title,
    body: parsed.data.body,
    rawTranscript: parsed.data.rawTranscript ?? undefined,
    status: parsed.data.status
  });

  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(updated);
});

// POST /business/meetings/:id/share — 공유 토큰 발급 (idempotent)
meetingsRouter.post("/:id/share", requireAuth, async (req, res) => {
  const note = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const token = note.shareToken ?? randomBytes(20).toString("hex");
  if (!note.shareToken) {
    await setShareToken(req.params["id"] as string, req.authUser!.id, token);
  }

  res.json({ shareToken: token });
});

// POST /business/meetings/:id/summarize — Anthropic으로 본문 요약 + action items 추출.
// 결과는 새 body 앞에 prepend (사용자 원본은 아래 보존).
// idempotent X — 매 호출마다 비용 발생. 짧은 시간 내 중복 호출 차단은 usage 가드가 담당.
meetingsRouter.post("/:id/summarize", requireAuth, async (req, res) => {
  const note = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (!note.body && !note.rawTranscript) {
    res.status(400).json({ error: "empty_content", message: "본문이나 자막이 있어야 요약할 수 있습니다." });
    return;
  }

  try {
    const { markdown, result, tokensUsed } = await summarizeMeetingNote(req.authUser!.id, note);

    if (!markdown) {
      // Anthropic가 빈 결과 또는 실패 — usage는 차감 안 됨 (recordModelUsage best-effort).
      res.status(502).json({ error: "summarize_empty", message: "요약을 생성하지 못했습니다." });
      return;
    }

    // 기존 body 위에 AI 요약 prepend. divider로 구분.
    const existingBody = note.body.trim();
    const newBody = existingBody
      ? `${markdown}\n\n---\n\n## 원본 노트\n\n${existingBody}`
      : markdown;

    const updated = await updateMeetingNote(req.params["id"] as string, req.authUser!.id, {
      body: newBody,
      status: "done",
    });
    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({
      ok: true,
      note: updated,
      summary: result,
      tokensUsed,
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.code, message: err.message, details: err.details });
      return;
    }
    console.log(JSON.stringify({
      level: "warn",
      service: "aura-back",
      module: "meetings",
      message: "summarize failed",
      noteId: note.id,
      error: err instanceof Error ? err.message : String(err),
    }));
    res.status(500).json({ error: "summarize_failed" });
  }
});

// DELETE /business/meetings/:id/share — 공유 토큰 회수.
// 기존 link는 즉시 무효. 같은 노트를 다시 공유하면 새 token 발급됨.
meetingsRouter.delete("/:id/share", requireAuth, async (req, res) => {
  const note = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (note.shareToken) {
    await setShareToken(req.params["id"] as string, req.authUser!.id, null);
  }
  res.json({ ok: true });
});

// GET /business/meetings/:id/export
meetingsRouter.get("/:id/export", requireAuth, async (req, res) => {
  const note = await getMeetingNoteById(req.params["id"] as string, req.authUser!.id);
  if (!note) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const format = req.query["format"] === "docx" ? "docx" : "md";

  if (format === "md") {
    const md = `# ${note.title}\n\n_${note.createdAt.toLocaleDateString("ko-KR")}_\n\n---\n\n${note.body}`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(note.title)}.md"`);
    res.send(md);
    return;
  }

  // docx: markdown subset → Word 문서
  try {
    const buffer = await renderMeetingNoteToDocx(note.title, note.createdAt, note.body);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(note.title)}.docx"`,
    );
    res.send(buffer);
  } catch (err) {
    console.log(JSON.stringify({
      level: "warn",
      service: "aura-back",
      module: "meetings",
      message: "docx render failed",
      noteId: note.id,
      error: err instanceof Error ? err.message : String(err),
    }));
    res.status(500).json({ error: "docx_render_failed" });
  }
});

// DELETE /business/meetings/:id
meetingsRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteMeetingNote(req.params["id"] as string, req.authUser!.id);
  res.json({ ok: true });
});
