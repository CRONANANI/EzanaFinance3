import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'app',
  'api',
  'watchlists',
);

const files = [
  path.join(root, 'route.js'),
  path.join(root, '[listId]', 'route.js'),
  path.join(root, '[listId]', 'items', 'route.js'),
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('withApiGuard')) {
    c = c.replace(
      /import \{ NextResponse \} from 'next\/server';/,
      "import { NextResponse } from 'next/server';\nimport { withApiGuard } from '@/lib/api-guard';",
    );
  }

  const isDynamic = file.includes('[');
  const handlerArgs = isDynamic ? '(request, user, context)' : '(request, user)';
  const paramsLine = isDynamic ? '  const params = context?.params ?? {};\n' : '';

  c = c.replace(
    /export async function (GET|POST|PATCH|DELETE)\(request(?:, \{ params \})?\) \{\s*try \{\s*const \{ user, supabase \} = await getAuthContext\(request\);\s*if \(!user \|\| !supabase\) \{\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);\s*\}\s*/g,
    `export const $1 = withApiGuard(async ${handlerArgs} => {\n${paramsLine}  try {\n    const { supabase } = await getAuthContext(request);\n    if (!supabase) {\n      return NextResponse.json({ error: 'Server error' }, { status: 500 });\n    }\n\n`,
  );

  c = c.replace(/\n\}\n\nexport async function/g, '\n}, { requireAuth: true });\n\nexport const');
  c = c.replace(/\n\}\n*$/g, '\n}, { requireAuth: true });\n');

  if (isDynamic) {
    c = c.replace(/\{ listId \} = params/g, 'listId = params.listId');
  }

  fs.writeFileSync(file, c, 'utf8');
  console.log('wrapped', path.relative(root, file));
}
