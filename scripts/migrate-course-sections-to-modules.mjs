#!/usr/bin/env node
/**
 * Converts course sections to explicit `modules` arrays.
 * Run: node scripts/migrate-course-sections-to-modules.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSection } from '../src/lib/section-modules-transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB_DIR = path.resolve(__dirname, '../src/lib');

const COURSE_CONTENT_FILES = [
  'course-content-bronze-rest.js',
  'course-content-crypto-bronze.js',
  'course-content-silver-gold-platinum.js',
];

async function loadCourseExport(fullPath) {
  const mod = await import(pathToFileURL(fullPath).href);
  return mod.default || mod.COURSE_CONTENT || mod;
}

async function main() {
  let totalSections = 0;
  let transformedCount = 0;

  for (const file of COURSE_CONTENT_FILES) {
    const fullPath = path.join(LIB_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[migrate] skip missing ${file}`);
      continue;
    }

    const courseContent = await loadCourseExport(fullPath);
    const newContent = {};

    for (const [courseId, course] of Object.entries(courseContent)) {
      if (!course?.sections) {
        newContent[courseId] = course;
        continue;
      }
      const newSections = course.sections.map((s) => {
        totalSections += 1;
        const hadModules = Array.isArray(s.modules) && s.modules.length > 0;
        const out = transformSection(s);
        if (!hadModules) transformedCount += 1;
        return out;
      });
      newContent[courseId] = { ...course, sections: newSections };
    }

    const sidecarPath = fullPath.replace(/\.js$/, '.modules.json');
    fs.writeFileSync(sidecarPath, JSON.stringify(newContent, null, 2));
    console.log(`[migrate] wrote ${path.relative(LIB_DIR, sidecarPath)}`);
  }

  console.log(`\n[migrate] DONE — transformed ${transformedCount}/${totalSections} sections`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
