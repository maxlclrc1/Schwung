/*
 * Schwung's temporary files for sharing (data exports, recovery exports, 66-Day Story images) live in one
 * app-managed folder in the cache, each named `<kind>-<time it was made>.<ext>`, so cleanup can tell exactly which
 * files are Schwung's own and how old they are. Nothing outside that folder (and its named predecessors) is ever
 * touched; images saved to Photos are copies in the photo library, never these files.
 */

export const TEMP_DIR = 'schwung-exports';
export const TEMP_KINDS = ['data', 'recovery', 'story'] as const;
export type TempKind = (typeof TEMP_KINDS)[number];

/** How long a shared file is kept for the app receiving it before it's cleaned up. */
export const SHARE_GRACE_MS = 2 * 60 * 1000;
/** On a later launch, files older than this are abandoned (a share that was cut off) and removed. */
export const ABANDONED_MS = 10 * 60 * 1000;

/** Files Schwung once wrote straight into the cache, before the managed folder: removed on cleanup. */
export const LEGACY_CACHE_FILES = ['schwung-export.json', 'schwung-field-notes.json'];

export const tempName = (kind: TempKind, ext: string, now: number) => `${kind}-${now}.${ext}`;

/** The kind and creation time of one of Schwung's temporary files, or null for anything else. */
export function parseTempName(name: string): { kind: TempKind; at: number } | null {
  const m = /^(data|recovery|story)-(\d{10,})\.(json|txt|png)$/.exec(name);
  return m ? { kind: m[1] as TempKind, at: Number(m[2]) } : null;
}

/** Which files in the managed folder to remove now: only Schwung's own, and only once older than `maxAgeMs`. */
export function filesToClean(names: string[], now: number, maxAgeMs: number): string[] {
  return names.filter((n) => {
    const t = parseTempName(n);
    return t !== null && now - t.at >= maxAgeMs;
  });
}
