import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {};

  // Test 1: Import @google/genai
  try {
    const genai = await import('@google/genai');
    checks['@google/genai'] = 'OK - exports: ' + Object.keys(genai).slice(0, 5).join(', ');
  } catch (e: any) {
    checks['@google/genai'] = 'FAIL - ' + e.message;
  }

  // Test 2: Import _lib/ai-client
  try {
    const aiClient = await import('./_lib/ai-client');
    checks['_lib/ai-client'] = 'OK - exports: ' + Object.keys(aiClient).join(', ');
  } catch (e: any) {
    checks['_lib/ai-client'] = 'FAIL - ' + e.message;
  }

  return res.status(200).json({
    ok: true,
    node: process.version,
    checks,
  });
}
