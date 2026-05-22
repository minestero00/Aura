import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";

/**
 * Markdown → .docx Buffer.
 *
 * 회의록 템플릿이 쓰는 markdown subset만 지원:
 * - `# H1`, `## H2`, `### H3`
 * - 일반 단락
 * - `- ` 또는 `* ` 불릿
 * - 파이프(`|`) 구분 테이블 (`| col1 | col2 |` + `|---|---|` separator)
 * - `**bold**` 인라인
 *
 * GFM 전체 호환은 목표가 아니다 — 회의록 export에 충분한 만큼.
 */
export async function renderMeetingNoteToDocx(
  title: string,
  createdAt: Date,
  bodyMarkdown: string,
): Promise<Buffer> {
  const blocks: (Paragraph | Table)[] = [];

  // 제목 + 작성일
  blocks.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
  );
  blocks.push(
    new Paragraph({
      children: [
        new TextRun({
          text: createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
          italics: true,
          color: "808080",
        }),
      ],
      spacing: { after: 240 },
    }),
  );

  const lines = bodyMarkdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // 빈 줄 → 간격용 빈 단락
    if (line.trim() === "") {
      blocks.push(new Paragraph({ text: "" }));
      i++;
      continue;
    }

    // 헤딩
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!.trim();
      const headingLevel =
        level === 1 ? HeadingLevel.HEADING_1
          : level === 2 ? HeadingLevel.HEADING_2
            : level === 3 ? HeadingLevel.HEADING_3
              : HeadingLevel.HEADING_4;
      blocks.push(new Paragraph({
        text,
        heading: headingLevel,
        spacing: { before: 240, after: 120 },
      }));
      i++;
      continue;
    }

    // 테이블 감지: 현재 줄 `| ... |` + 다음 줄 `|---|...`
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s\-:|]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const headerCells = parseTableRow(line);
      const rows: string[][] = [headerCells];
      i += 2;  // header + separator skip
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i] ?? "")) {
        rows.push(parseTableRow(lines[i] ?? ""));
        i++;
      }
      blocks.push(buildTable(rows));
      continue;
    }

    // 불릿 list
    const bulletMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      blocks.push(new Paragraph({
        children: parseInline(bulletMatch[1]!),
        bullet: { level: 0 },
      }));
      i++;
      continue;
    }

    // 일반 단락
    blocks.push(new Paragraph({ children: parseInline(line) }));
    i++;
  }

  const doc = new Document({
    creator: "AURA Business",
    title,
    description: "Meeting note exported from AURA Business",
    sections: [{ properties: {}, children: blocks }],
  });

  return Packer.toBuffer(doc);
}

function parseTableRow(line: string): string[] {
  // 양 끝 `|` 떼고 split
  return line.replace(/^\||\|$/g, "").split("|").map(s => s.trim());
}

function buildTable(rows: string[][]): Table {
  const colCount = Math.max(...rows.map(r => r.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, idx) =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, ci) =>
          new TableCell({
            width: { size: 100 / colCount, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: parseInline(row[ci] ?? ""),
              alignment: idx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
            })],
          })
        ),
        tableHeader: idx === 0,
      })
    ),
  });
}

function parseInline(text: string): TextRun[] {
  // **bold** 만 지원 — 나머지는 plain text
  const runs: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
    runs.push(new TextRun({ text: m[1]!, bold: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  if (runs.length === 0) runs.push(new TextRun(text));
  return runs;
}
