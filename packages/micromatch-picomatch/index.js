"use strict";

// deepagents only calls micromatch.isMatch(). micromatch implements it as
// picomatch(patterns, options)(str); picomatch parses brace patterns itself,
// so this stand-in matches identically without depending on `braces`
// (GHSA-vfj7-8cjw-p6xm has no patched release). Any other micromatch API is
// deliberately absent so a new caller fails loudly instead of silently.
const picomatch = require("picomatch");

function isMatch(str, patterns, options) {
  return picomatch(patterns, options)(str);
}

module.exports = { isMatch };
