#!/usr/bin/env node
/**
 * Generate barrel index.ts files for a source directory.
 *
 * Usage:
 *   node scripts/generate-barrels.mjs <src-dir> [options]
 *
 * Options:
 *   --ext <ts|tsx>     Comma-separated extensions to include (default: "ts,tsx")
 *   --dry              Print what would be written without touching disk
 *   --quiet            Suppress per-file logs (summary still prints)
 *   --force            Overwrite existing index.ts(x) files (with a .bak backup)
 *   --empty            Write empty barrels for directories with no source files
 *
 * Behavior:
 *   - Skips test files (*.test.ts, *.spec.ts), scratch files (*.scratch.ts),
 *     and dotfiles.
 *   - Skips index.ts(x) itself (no self-export / circular exports).
 *   - Detects existing index file extension (.ts vs .tsx) so it writes the
 *     correct one and never produces duplicate index.ts / index.tsx pairs.
 *   - For each subdirectory it visits:
 *       - If the subdirectory contains its own index.ts(x) (a sub-barrel),
 *         the parent re-exports the subdirectory as a namespace.
 *       - Otherwise it inlines the subdirectory's files.
 *   - Sorts exports alphabetically for stable diffs.
 *
 * Examples:
 *   node scripts/generate-barrels.mjs api/src
 *   node scripts/generate-barrels.mjs app/src --ext ts,tsx
 */

import { readdirSync, statSync, existsSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { join, relative, resolve, dirname, basename, extname } from 'node:path';

const args = process.argv.slice(2);
const positional = [];
let extensions = ['ts', 'tsx'];
let dry = false;
let quiet = false;
let force = false;
let writeEmpty = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--ext') {
    extensions = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
  } else if (arg === '--dry') {
    dry = true;
  } else if (arg === '--quiet') {
    quiet = true;
  } else if (arg === '--force') {
    force = true;
  } else if (arg === '--empty') {
    writeEmpty = true;
  } else if (arg.startsWith('--')) {
    console.error(`Unknown flag: ${arg}`);
    process.exit(2);
  } else {
    positional.push(arg);
  }
}

if (positional.length === 0) {
  console.error('Missing <src-dir> argument.');
  process.exit(2);
}

const srcDir = resolve(positional[0]);
if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
  console.error(`Not a directory: ${srcDir}`);
  process.exit(2);
}

const SKIP_NAME_PATTERNS = [
  /^\./, // dotfiles / hidden dirs
  /\.(test|spec)\.[^.]+$/, // *.test.ts, *.spec.tsx, etc.
  /\.scratch\.[^.]+$/, // *.scratch.ts — dev-only scratch files
];

const INDEX_FILES = ['index.ts', 'index.tsx'];

function isIndexFile(name) {
  return INDEX_FILES.includes(name);
}

function getExistingIndexFile(dir) {
  for (const name of INDEX_FILES) {
    const fullPath = join(dir, name);
    if (existsSync(fullPath)) return fullPath;
  }
  return null;
}

function hasValidBarrel(dir) {
  const indexPath = getExistingIndexFile(dir);
  if (!indexPath) return false;
  try {
    const content = readFileSync(indexPath, 'utf8').trim();
    return content.length > 0;
  } catch {
    return false;
  }
}

function isHandWrittenIndex(dir) {
  const indexPath = getExistingIndexFile(dir);
  if (!indexPath) return false;
  try {
    const content = readFileSync(indexPath, 'utf8').trim();
    if (content.length === 0) return false;
    if (content.startsWith('// Auto-generated')) return false;
    return true;
  } catch {
    return false;
  }
}

function shouldSkip(name) {
  return SKIP_NAME_PATTERNS.some((re) => re.test(name));
}

function isSourceFile(name) {
  const ext = extname(name).slice(1);
  return extensions.includes(ext) && !isIndexFile(name) && !shouldSkip(name);
}

function toModuleSpecifier(fromDir, targetPath) {
  // targetPath is an absolute file path; produce a relative import specifier
  // with no extension (TS resolution handles that).
  let rel = relative(fromDir, targetPath).replace(/\\/g, '/');
  // Ensure leading "./" for relative paths.
  if (!rel.startsWith('.')) rel = `./${rel}`;
  // Drop the extension.
  rel = rel.replace(/\.[^./]+$/, '');
  return rel;
}

function toNamespace(name) {
  // Folder name -> safe JS identifier.
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

function readDirSafe(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter((d) => !shouldSkip(d.name));
}

/**
 * Build the export block for one directory. Returns null if there's nothing
 * meaningful to export (empty dir or only subdirs without barrels and no files).
 */
function buildBarrel(dir) {
  const entries = readDirSafe(dir);
  const files = entries.filter((e) => e.isFile() && isSourceFile(e.name));
  const dirs = entries.filter((e) => e.isDirectory());

  const fileExports = files
    .map((f) => f.name)
    .sort()
    .map((name) => {
      const base = basename(name, extname(name));
      const spec = toModuleSpecifier(dir, join(dir, name));
      return `export * from '${spec}';`;
    });

  const dirExports = [];
  for (const d of dirs) {
    const subDir = join(dir, d.name);
    const hasSubBarrel = hasValidBarrel(subDir);
    if (hasSubBarrel) {
      // Re-export the sub-barrel through a namespace.
      const spec = toModuleSpecifier(dir, subDir);
      const ns = toNamespace(d.name);
      dirExports.push(`export * as ${ns} from '${spec}';`);
    } else {
      // Inline the directory's own files as a nested namespace.
      const nested = buildBarrelInline(subDir, d.name);
      if (nested) dirExports.push(nested);
    }
  }

  if (fileExports.length === 0 && dirExports.length === 0) return null;

  const header = '// Auto-generated barrel. Do not edit by hand.\n';
  const body = [...fileExports, ...dirExports].join('\n');
  return `${header}${body}\n`;
}

/**
 * Inline a subdirectory that has no barrel of its own.
 * Produces an `export * as ns from './path';` block only if the dir
 * itself has exportable content.
 */
function buildBarrelInline(dir, dirName) {
  const inner = buildBarrel(dir);
  if (!inner) return null;
  const spec = toModuleSpecifier(dirname(dir), dir);
  const ns = toNamespace(dirName);
  return `export * as ${ns} from '${spec}';`;
}

function detectExistingIndexExtension(dir) {
  // Pick the index file extension that already exists in this dir, preferring
  // .tsx when both are present. Returns null when no index file exists yet.
  const hasTsx = existsSync(join(dir, 'index.tsx'));
  const hasTs = existsSync(join(dir, 'index.ts'));
  if (hasTsx) return 'tsx';
  if (hasTs) return 'ts';
  return null;
}

const summary = {
  wrote: 0,
  unchanged: 0,
  kept: 0,
  empty: 0,
  skipped: 0,
};

function isExpoRouterRoute(dir) {
  // A dir containing _layout.tsx is an Expo Router route segment; its
  // index.tsx is a route, never a barrel. Even --force must not clobber it.
  if (existsSync(join(dir, '_layout.tsx'))) return true;
  // app/ route root in Expo Router: has either _layout.tsx or just an index.tsx.
  return false;
}

function writeBarrel(dir, content) {
  // Guard rail: never touch an Expo Router route file, even with --force.
  if (isExpoRouterRoute(dir)) {
    if (!quiet) console.log(`skip (expo-router route): ${relative(process.cwd(), dir)}`);
    summary.skipped += 1;
    return;
  }
  const existingExt = detectExistingIndexExtension(dir);
  // If a .tsx index already exists (e.g. Expo Router route), respect that and
  // don't write a .ts twin — unless --force is set.
  let targetExt;
  if (existingExt && extensions.includes(existingExt)) {
    targetExt = existingExt;
  } else if (existingExt) {
    // Existing index uses an extension we weren't asked to generate — leave it.
    if (!quiet) console.log(`skip (existing ${existingExt}): ${relative(process.cwd(), dir)}`);
    summary.skipped += 1;
    return;
  } else {
    // No existing index. Prefer tsx only if any tsx files live in this dir.
    const hasTsx = readdirSync(dir).some((n) => n.endsWith('.tsx') && isSourceFile(n));
    targetExt = hasTsx ? 'tsx' : 'ts';
  }
  const target = join(dir, `index.${targetExt}`);
  if (dry) {
    console.log(`[dry] would write: ${target}`);
    console.log(content.split('\n').map((l) => `      ${l}`).join('\n'));
    return;
  }
  if (existsSync(target) && !force) {
    const existing = readFileSync(target, 'utf8');
    if (existing === content) {
      if (!quiet) console.log(`unchanged: ${relative(process.cwd(), target)}`);
      summary.unchanged += 1;
      return;
    }
  }
  if (existsSync(target) && force) {
    const backup = `${target}.bak`;
    copyFileSync(target, backup);
    if (!quiet) console.log(`backup:    ${relative(process.cwd(), backup)}`);
  }
  writeFileSync(target, content, 'utf8');
  if (!quiet) console.log(`wrote:     ${relative(process.cwd(), target)}`);
  summary.wrote += 1;
}

function writeEmptyBarrel(dir) {
  const existingExt = detectExistingIndexExtension(dir);
  if (existingExt) return; // don't disturb existing files
  const hasTsx = readdirSync(dir).some((n) => n.endsWith('.tsx'));
  const targetExt = hasTsx ? 'tsx' : 'ts';
  const target = join(dir, `index.${targetExt}`);
  const content = '// Auto-generated empty barrel. Add exports as source files appear.\n';
  if (dry) {
    console.log(`[dry] would write empty: ${target}`);
    return;
  }
  if (existsSync(target)) return;
  writeFileSync(target, content, 'utf8');
  if (!quiet) console.log(`wrote (empty): ${relative(process.cwd(), target)}`);
  summary.empty += 1;
}

function walk(dir) {
  // Always recurse into subdirectories first so sub-barrels get generated before parent runs.
  const entries = readDirSafe(dir);
  for (const e of entries) {
    if (e.isDirectory()) walk(join(dir, e.name));
  }

  const handWritten = isHandWrittenIndex(dir);
  if (!handWritten || force) {
    const content = buildBarrel(dir);
    if (content) {
      writeBarrel(dir, content);
    } else if (writeEmpty) {
      writeEmptyBarrel(dir);
    }
  } else {
    if (!quiet) console.log(`keep (hand-written index): ${relative(process.cwd(), dir)}`);
    summary.kept += 1;
  }
}

console.log(`Generating barrels under: ${srcDir}`);
console.log(`Extensions: ${extensions.join(', ')}  Dry: ${dry}  Force: ${force}  Empty: ${writeEmpty}`);
walk(srcDir);
console.log(
  `Done. wrote=${summary.wrote}  unchanged=${summary.unchanged}  kept=${summary.kept}  ` +
    `empty=${summary.empty}  skipped=${summary.skipped}`,
);
