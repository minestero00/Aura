import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { AppError } from "../../lib/errors/app-error.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { transcribeAudio } from "./service.js";

// 단일 파일, 메모리 저장(디스크 IO 회피). 25MB 제한 — Whisper 자체도 25MB까지.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});

export const voiceRouter = Router();

voiceRouter.post(
  "/transcribe",
  requireAuth,
  upload.single("audio"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      throw new AppError(400, "VOICE_FILE_REQUIRED", "Audio file is required (field 'audio').");
    }
    const language = typeof req.body?.language === "string" ? req.body.language : undefined;

    const result = await transcribeAudio({
      userId: req.authUser!.id,
      audio: file.buffer,
      mimeType: file.mimetype || "audio/m4a",
      language,
      filename: file.originalname
    });

    res.json({
      ok: true,
      text: result.text,
      durationSeconds: result.durationSeconds
    });
  })
);
