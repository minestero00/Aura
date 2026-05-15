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
  const limit = Math.min(Number(req.query["limit"] ?? 20), 50);
  const offset = Number(req.query["offset"] ?? 0);
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

// POST /business/meetings/:id/share — 공유 토큰 발급
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

  // docx: 간단 텍스트 fallback (실제 docx 생성은 추후 추가)
  res.status(501).json({ error: "docx_not_implemented" });
});

// DELETE /business/meetings/:id
meetingsRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteMeetingNote(req.params["id"] as string, req.authUser!.id);
  res.json({ ok: true });
});
