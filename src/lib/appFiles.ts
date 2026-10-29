import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  ABANDONED_MS,
  filesToClean,
  LEGACY_CACHE_FILES,
  SHARE_GRACE_MS,
  TEMP_DIR,
  tempName,
  type TempKind,
} from '../core/tempFiles';

/*
 * Schwung's temporary share files (core/tempFiles.ts): written into one app-managed folder in the cache, shared
 * through the iOS share sheet, then removed once the app receiving them has had time to take its copy. Anything
 * left behind by a share that was cut off is removed on a later launch. Never touches the saves, recovery copies
 * or anything outside this folder.
 */

function folder(): Directory {
  const d = new Directory(Paths.cache, TEMP_DIR);
  d.create({ intermediates: true, idempotent: true });
  return d;
}

/** Writes text to a new temporary file of this kind. */
export async function writeTemp(kind: TempKind, ext: 'json' | 'txt', text: string): Promise<File> {
  const file = new File(folder(), tempName(kind, ext, Date.now()));
  await file.write(text);
  return file;
}

/** Moves a file made elsewhere (a captured story image) into the managed folder. */
export async function adoptTemp(kind: TempKind, uri: string): Promise<File> {
  const target = new File(folder(), tempName(kind, 'png', Date.now()));
  await new File(uri).move(target);
  return target;
}

/** Deletes one temporary file now (no error if it's already gone). */
export function removeTemp(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Left for the next cleanup.
  }
}

/**
 * Shares a temporary file through the share sheet, and removes it a little after the sheet closes (shared or
 * dismissed), so the receiving app can finish taking its copy. If the app quits first, the next launch removes it.
 */
export async function shareTemp(file: File, options: Sharing.SharingOptions): Promise<void> {
  try {
    await Sharing.shareAsync(file.uri, options);
  } finally {
    setTimeout(() => removeTemp(file), SHARE_GRACE_MS);
  }
}

/** On launch: removes abandoned temporary files, and the files older versions wrote straight into the cache. */
export function cleanupTemps(now: number = Date.now()) {
  try {
    const d = folder();
    const files = d.list().filter((e): e is File => e instanceof File);
    const old = new Set(
      filesToClean(
        files.map((f) => f.name),
        now,
        ABANDONED_MS,
      ),
    );
    for (const f of files) if (old.has(f.name)) removeTemp(f);
    for (const name of LEGACY_CACHE_FILES) removeTemp(new File(Paths.cache, name));
  } catch {
    // Cleanup is best effort; it's tried again next launch.
  }
}

/** Removes every temporary share file now (ending a reset, deleting all data). Throws if any remains. */
export function removeAllTemps() {
  const d = folder();
  for (const e of d.list()) e.delete();
  for (const name of LEGACY_CACHE_FILES) removeTemp(new File(Paths.cache, name));
  if (d.list().length) throw new Error('Some temporary files remain');
}
