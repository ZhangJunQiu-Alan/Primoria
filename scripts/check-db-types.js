#!/usr/bin/env node

const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const target = join(process.cwd(), 'packages', 'db', 'src', 'database.generated.ts');

if (!existsSync(target)) {
  console.error(`Missing generated DB types file: ${target}`);
  process.exit(1);
}

const content = readFileSync(target, 'utf8');

const requiredMarkers = [
  'export type Database',
  'course_analytics_baselines',
  'viewer_analytics_events',
  'get_author_dashboard_analytics',
  'track_viewer_analytics_event',
  'viewer_analytics_event_type',
];

const missing = requiredMarkers.filter((marker) => !content.includes(marker));

if (missing.length > 0) {
  console.error(`DB types are missing required markers: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('DB types markers look current.');
