/**
 * CLI self-update functionality
 * Uses git pull + rebuild from ~/.epost-kit/cli/ (installed via install script)
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Get the persistent CLI install directory */
function getCliDir(): string {
  return join(homedir(), '.epost-kit', 'cli');
}

/** Assert CLI was installed via install script (has a .git directory) */
function assertGitInstall(cliDir: string): void {
  if (!existsSync(join(cliDir, '.git'))) {
    throw new Error(
      `CLI not installed via install script (expected git repo at ${cliDir}).\n` +
      `Run the install script to set up: install/install.sh`
    );
  }
}

/** Read current CLI version from package.json */
export async function getCurrentVersion(): Promise<string> {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch (error) {
    throw new Error(`Failed to read current version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/** Get short git SHA for local HEAD in install dir */
async function getLocalSha(cliDir: string): Promise<string> {
  const result = await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd: cliDir });
  return result.stdout.trim();
}

/** Fetch origin and return short SHA of origin/master */
async function getRemoteSha(cliDir: string): Promise<string> {
  await execa('git', ['fetch', 'origin', 'master'], { cwd: cliDir });
  const result = await execa('git', ['rev-parse', '--short', 'origin/master'], { cwd: cliDir });
  return result.stdout.trim();
}

/** Check if update is available by comparing local vs remote git SHAs */
export async function checkForUpdate(): Promise<{
  current: string;
  latest: string;
  updateAvailable: boolean;
}> {
  const cliDir = getCliDir();
  assertGitInstall(cliDir);

  const current = await getLocalSha(cliDir);
  const latest = await getRemoteSha(cliDir);
  const updateAvailable = current !== latest;
  return { current, latest, updateAvailable };
}

/** Execute update: git pull + npm install + npm run build */
export async function executeUpdate(): Promise<void> {
  const cliDir = getCliDir();
  assertGitInstall(cliDir);

  await execa('git', ['pull', 'origin', 'master'], { cwd: cliDir, stdio: 'inherit' });
  await execa('npm', ['install'], { cwd: cliDir, stdio: 'inherit' });
  await execa('npm', ['run', 'build'], { cwd: cliDir, stdio: 'inherit' });
}

/** Get changelog preview via git log between two SHAs */
export async function getChangelogPreview(fromSha: string, toSha: string): Promise<string> {
  const cliDir = getCliDir();
  try {
    const result = await execa(
      'git',
      ['log', '--oneline', `${fromSha}..${toSha}`],
      { cwd: cliDir }
    );
    const commits = result.stdout.trim();
    return commits
      ? `Changes since ${fromSha}:\n${commits}`
      : `Update available: ${fromSha} → ${toSha}`;
  } catch {
    return `Update available: ${fromSha} → ${toSha}`;
  }
}

/** Verify update succeeded by checking local SHA matches expected */
export async function verifyUpdate(expectedSha: string): Promise<boolean> {
  try {
    const cliDir = getCliDir();
    const current = await getLocalSha(cliDir);
    return current === expectedSha;
  } catch {
    return false;
  }
}
