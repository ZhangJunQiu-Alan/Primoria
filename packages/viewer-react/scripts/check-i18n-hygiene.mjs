import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = path.resolve('.');
const sourceRoot = path.join(workspaceRoot, 'src');
const protectedTargets = [
  path.join(sourceRoot, 'App.tsx'),
  path.join(sourceRoot, 'app', 'router.tsx'),
  path.join(sourceRoot, 'components', 'account', 'AccountMenu.tsx'),
  path.join(sourceRoot, 'features', 'public'),
  path.join(sourceRoot, 'shared', 'i18n'),
  path.join(sourceRoot, 'shared', 'layout'),
];

const allowedFiles = new Set([
  path.join(sourceRoot, 'shared', 'i18n', 'locale.ts'),
  path.join(sourceRoot, 'shared', 'i18n', 'dictionary.ts'),
  path.join(sourceRoot, 'shared', 'layout', 'PublicLayout.tsx'),
]);

const filePattern = /\.(ts|tsx)$/;
const inlineLanguagePattern = /language\s*===\s*['"]zh-CN['"]/;
const legacyCopyImportPattern = /@\/shared\/theme\/copy/;
const legacyCopyUsagePattern = /\b(useViewerCopy|getViewerCopy|viewerCopy)\b/;

async function listFiles(targetPath) {
  const stats = await fs.stat(targetPath);
  if (stats.isFile()) {
    return filePattern.test(targetPath) ? [targetPath] : [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => listFiles(path.join(targetPath, entry.name))),
  );
  return nested.flat();
}

async function main() {
  const files = (await Promise.all(protectedTargets.map((target) => listFiles(target)))).flat();
  const violations = [];

  for (const file of files) {
    if (allowedFiles.has(file)) {
      continue;
    }

    const content = await fs.readFile(file, 'utf8');

    if (inlineLanguagePattern.test(content)) {
      violations.push(`${path.relative(workspaceRoot, file)}: inline zh-CN ternary`);
    }

    if (legacyCopyImportPattern.test(content) || legacyCopyUsagePattern.test(content)) {
      violations.push(`${path.relative(workspaceRoot, file)}: legacy shared/theme/copy usage`);
    }
  }

  if (violations.length) {
    console.error('i18n hygiene check failed:');
    violations.forEach((violation) => console.error(`- ${violation}`));
    process.exitCode = 1;
    return;
  }

  console.log('i18n hygiene check passed.');
}

await main();
