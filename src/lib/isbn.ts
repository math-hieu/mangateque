export type ParsedTitle = {
  seriesTitle: string;
  volumeNumber: number | null;
};

const PATTERNS: [RegExp, number, number][] = [
  [/^(.+?),?\s+Vol(?:ume)?\.?\s*(\d+)/i, 1, 2],
  [/^(.+?)\s*[-–—]\s*[Tt]ome?\s*(\d+)/i, 1, 2],
  [/^(.+?)\s+[Tt]\.?\s*(\d+)\s*$/i, 1, 2],
  [/^(.+?)\s+(\d+)\s*$/i, 1, 2],
];

export function parseVolumeTitle(rawTitle: string): ParsedTitle {
  for (const [regex, titleGroup, numGroup] of PATTERNS) {
    const m = rawTitle.match(regex);
    if (m) {
      return {
        seriesTitle: m[titleGroup].trim(),
        volumeNumber: parseInt(m[numGroup], 10),
      };
    }
  }
  return { seriesTitle: rawTitle.trim(), volumeNumber: null };
}

export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
