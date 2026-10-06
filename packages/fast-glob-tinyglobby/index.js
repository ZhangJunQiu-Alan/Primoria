"use strict";

// deepagents' FilesystemBackend only calls fastGlob(pattern, { cwd, absolute,
// onlyFiles | onlyDirectories, dot }) and awaits the string[] result. fast-glob
// expands braces through micromatch -> braces, which has no patched release for
// GHSA-vfj7-8cjw-p6xm; the patterns here come from the model, so the DoS is
// reachable. tinyglobby (fdir + picomatch) answers the same calls without it.
const { glob } = require("tinyglobby");

async function fastGlob(pattern, options = {}) {
  const matches = await glob(pattern, {
    ...options,
    // fast-glob never treats a bare directory name as "dir/**".
    expandDirectories: false,
  });
  // tinyglobby marks directories with a trailing slash; fast-glob does not.
  return matches.map((match) => (match.length > 1 && match.endsWith("/") ? match.slice(0, -1) : match));
}

module.exports = fastGlob;
