import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AuraLogo from "@/components/AuraLogo";

interface SharedNote {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

async function fetchSharedNote(token: string): Promise<SharedNote | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const res = await fetch(`${apiUrl}/business/meetings/share/${token}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json() as Promise<SharedNote>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const note = await fetchSharedNote(token);
  return {
    title: note ? `${note.title} — AURA Business` : "회의록 — AURA Business"
  };
}

export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const note = await fetchSharedNote(token);

  if (!note) notFound();

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2">
          <AuraLogo size={24} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>AURA Business</span>
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ background: "var(--aurora-soft)", color: "var(--aurora)" }}
        >
          공유 회의록
        </span>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-float)" }}
        >
          {/* Note header */}
          <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--line)" }}>
            <h1 className="text-[18px] font-bold" style={{ color: "var(--text)" }}>{note.title}</h1>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
              {fmtDate(note.createdAt)}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <pre
              className="text-[13px] leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: "var(--text)" }}
            >
              {note.body}
            </pre>
          </div>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: "var(--text-muted)" }}>
          AURA Business로 회의를 더 스마트하게 →{" "}
          <a href="/login" style={{ color: "var(--aurora)" }}>시작하기</a>
        </p>
      </main>
    </div>
  );
}
