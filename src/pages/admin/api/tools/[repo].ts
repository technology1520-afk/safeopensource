import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getTool, patchToolContent, PROTECTED_FIELDS } from '../../../../lib/admin/tools-service';

export const prerender = false;

// Allowed human-written fields schema (strict)
const HumanFieldsSchema = z
  .object({
    tagline: z.string().optional(),
    name: z.string().optional(),
    category: z.string().optional(),
    use_cases: z.array(z.string()).optional(),
    requirements: z.record(z.any()).optional(),
    who_for: z.record(z.any()).optional(),
    website_url: z.string().optional(),
    ai_report_status: z.enum(['draft', 'approved']).optional(),
    ai_report: z.string().optional(),
    unlisted: z.boolean().optional(),
  })
  .strict();

export const GET: APIRoute = async ({ params, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const { repo } = params;
  if (!repo) {
    return new Response(JSON.stringify({ error: 'Missing tool identifier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tool = getTool(repo);
  if (!tool) {
    return new Response(JSON.stringify({ error: `Tool "${repo}" not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(tool), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const { repo } = params;
  if (!repo) {
    return new Response(JSON.stringify({ error: 'Missing tool identifier' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();

    // Accuracy Check: Detect score tampering attempts immediately and return 422
    for (const key of Object.keys(rawBody)) {
      if (PROTECTED_FIELDS.has(key)) {
        return new Response(
          JSON.stringify({
            error: 'Unprocessable Entity: Score tampering prohibited. Scores, scorecard, and verdicts are pipeline-owned.',
            field: key,
          }),
          {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const parseResult = HumanFieldsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed: Unknown or invalid human fields',
          details: parseResult.error.flatten(),
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { tool, diff } = patchToolContent(repo, parseResult.data, auth.principal, auth.ip);

    return new Response(
      JSON.stringify({
        success: true,
        tool,
        diff,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    const status = err.name === 'ScoreTamperingError' ? 422 : 400;
    return new Response(JSON.stringify({ error: err.message || 'Update failed' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
