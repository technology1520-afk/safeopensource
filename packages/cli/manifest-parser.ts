import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export type Ecosystem = 'npm' | 'pypi' | 'go';

export interface ParsedDependency {
  name: string;
  version?: string;
  ecosystem: Ecosystem;
  rawSpec: string;
  isDev?: boolean;
}

export interface ManifestDetectionResult {
  filePath: string;
  type: Ecosystem;
  fileName: string;
}

/**
 * Auto-detect dependency manifest from current working directory or explicit path
 */
export function detectManifestFile(explicitPath?: string, cwd: string = process.cwd()): ManifestDetectionResult {
  if (explicitPath) {
    const resolvedPath = path.resolve(cwd, explicitPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Manifest file not found at path: ${resolvedPath}`);
    }

    const baseName = path.basename(resolvedPath).toLowerCase();
    if (baseName === 'package.json') {
      return { filePath: resolvedPath, type: 'npm', fileName: baseName };
    }
    if (baseName === 'requirements.txt' || baseName.endsWith('.txt')) {
      return { filePath: resolvedPath, type: 'pypi', fileName: baseName };
    }
    if (baseName === 'go.mod') {
      return { filePath: resolvedPath, type: 'go', fileName: baseName };
    }

    // Inspect content heuristics
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    if (content.trim().startsWith('{') && content.includes('"dependencies"')) {
      return { filePath: resolvedPath, type: 'npm', fileName: baseName };
    }
    if (content.includes('module ') && content.includes('require')) {
      return { filePath: resolvedPath, type: 'go', fileName: baseName };
    }
    return { filePath: resolvedPath, type: 'pypi', fileName: baseName };
  }

  // Auto-detection search priority: package.json -> requirements.txt -> go.mod
  const candidates: Array<{ name: string; type: Ecosystem }> = [
    { name: 'package.json', type: 'npm' },
    { name: 'requirements.txt', type: 'pypi' },
    { name: 'go.mod', type: 'go' },
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(cwd, candidate.name);
    if (fs.existsSync(candidatePath)) {
      return { filePath: candidatePath, type: candidate.type, fileName: candidate.name };
    }
  }

  throw new Error(
    `No supported manifest file found in "${cwd}". Expected package.json, requirements.txt, or go.mod.\nUse --manifest <path> to specify an explicit path.`
  );
}

/**
 * Clean version string by stripping operators like ^, ~, >=, =
 */
export function cleanVersion(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/^[\^~>=<~!v\s]+/, '').replace(/;.*$/, '').trim();
  return cleaned || trimmed;
}

/**
 * Parse package.json for primary dependencies (and optional devDependencies)
 */
export function parsePackageJson(filePath: string, includeDev = false): ParsedDependency[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  let json: any;
  try {
    json = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Invalid JSON in package.json at ${filePath}: ${err.message}`);
  }

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  if (json.dependencies && typeof json.dependencies === 'object') {
    for (const [pkg, spec] of Object.entries(json.dependencies)) {
      const rawSpec = String(spec);
      dependencies.push({
        name: pkg,
        version: cleanVersion(rawSpec),
        ecosystem: 'npm',
        rawSpec,
        isDev: false,
      });
      seen.add(pkg);
    }
  }

  if (includeDev && json.devDependencies && typeof json.devDependencies === 'object') {
    for (const [pkg, spec] of Object.entries(json.devDependencies)) {
      if (!seen.has(pkg)) {
        const rawSpec = String(spec);
        dependencies.push({
          name: pkg,
          version: cleanVersion(rawSpec),
          ecosystem: 'npm',
          rawSpec,
          isDev: true,
        });
        seen.add(pkg);
      }
    }
  }

  return dependencies;
}

/**
 * Parse Python requirements.txt
 */
export function parseRequirementsTxt(filePath: string): ParsedDependency[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (let line of lines) {
    line = line.trim();

    // Skip empty lines and comment lines
    if (!line || line.startsWith('#')) continue;

    // Skip pip flag lines (-r other.txt, -i ..., --extra-index-url ..., -f ...)
    if (line.startsWith('-') || line.startsWith('--')) continue;

    // Remove inline comments
    const inlineCommentIndex = line.indexOf('#');
    if (inlineCommentIndex !== -1) {
      line = line.substring(0, inlineCommentIndex).trim();
    }

    // Strip environment markers (e.g. ; python_version >= '3.8')
    const markerIndex = line.indexOf(';');
    const rawLine = line;
    if (markerIndex !== -1) {
      line = line.substring(0, markerIndex).trim();
    }

    // Regex pattern for PEP 508 / requirements.txt specs
    // Handles extras like `uvicorn[standard]==0.23.0`
    const match = line.match(/^([a-zA-Z0-9_\-\.]+)(?:\[[^\]]+\])?\s*(?:(==|>=|<=|~=|>|<|!=)\s*([a-zA-Z0-9_\-\.\*]+))?/);
    if (match) {
      const name = match[1];
      const version = match[3] ? cleanVersion(match[3]) : undefined;

      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        dependencies.push({
          name,
          version,
          ecosystem: 'pypi',
          rawSpec: rawLine,
          isDev: false,
        });
      }
    }
  }

  return dependencies;
}

/**
 * Parse Go go.mod
 */
export function parseGoMod(filePath: string): ParsedDependency[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  let inRequireBlock = false;

  for (let line of lines) {
    line = line.trim();

    if (!line || line.startsWith('//')) continue;

    if (line === 'require (') {
      inRequireBlock = true;
      continue;
    }

    if (inRequireBlock && line === ')') {
      inRequireBlock = false;
      continue;
    }

    let requireLine = '';
    if (inRequireBlock) {
      requireLine = line;
    } else if (line.startsWith('require ')) {
      requireLine = line.slice(8).trim();
    }

    if (requireLine) {
      const isIndirect = requireLine.includes('// indirect');
      // Strip comments
      const commentIdx = requireLine.indexOf('//');
      const cleanLine = (commentIdx !== -1 ? requireLine.substring(0, commentIdx) : requireLine).trim();
      const parts = cleanLine.split(/\s+/);

      if (parts.length >= 2) {
        const fullModule = parts[0];
        const rawVersion = parts[1];
        // Short name e.g. "github.com/gin-gonic/gin" -> "gin" (or keep fullModule)
        const name = fullModule;

        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          dependencies.push({
            name,
            version: cleanVersion(rawVersion),
            ecosystem: 'go',
            rawSpec: requireLine,
            isDev: isIndirect,
          });
        }
      }
    }
  }

  return dependencies;
}

/**
 * Unified manifest parser dispatcher
 */
export function parseManifest(manifestPath?: string, includeDev = false): {
  dependencies: ParsedDependency[];
  detection: ManifestDetectionResult;
} {
  const detection = detectManifestFile(manifestPath);

  let dependencies: ParsedDependency[] = [];
  switch (detection.type) {
    case 'npm':
      dependencies = parsePackageJson(detection.filePath, includeDev);
      break;
    case 'pypi':
      dependencies = parseRequirementsTxt(detection.filePath);
      break;
    case 'go':
      dependencies = parseGoMod(detection.filePath);
      break;
  }

  return { dependencies, detection };
}
