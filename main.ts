// Starkeeper's hand-in program (Node 22, standard library only). The game is
// the static files under game/, and the screenshots under screenshots/ are
// real renders of it. This program copies both into the grader's output
// directory and writes dossier.json, the summary the judge reads, using the
// kit's vendored library. It runs the same way outside the grader when
// MAKEFUN_OUTPUT_DIR names a local directory instead of /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps, as the starter documents them: the dossier text is
// capped, and the rest refuse an entry the scorer would refuse.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(repoRoot: string, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  for (const dir of ['game', 'screenshots']) {
    const source = join(repoRoot, dir);
    const target = join(outputDir, dir);
    if (existsSync(source)) {
      cpSync(source, target, { recursive: true });
    } else {
      mkdirSync(target, { recursive: true });
    }
  }
  const dossier = buildDossier(outputDir, CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(repoRoot, outputDir);
