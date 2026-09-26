import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listToolsSummary, addTool } from '../../../../lib/admin/tools-service';

export const prerender = false;

const AddToolSchema = z
  .object({
    repo_url: z.string().optional(),
    repo: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    name: z.string().optional(),
    tagline: z.string().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.repo_url || data.repo), {
    message: 'Either repo_url or repo is required',
    path: ['repo_url'],
  });

export const GET: APIRoute = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  const tools = listToolsSummary();
  return new Response(JSON.stringify(tools), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = locals.auth;
  if (!auth || !auth.principal) {
    return new Response('', { status: 404 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = AddToolSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { repo_url, repo, category, name, tagline } = parseResult.data;
    const targetRepo = repo_url || repo || '';

    const createdTool = addTool(
      {
        repo: targetRepo,
        category,
        name,
        tagline,
      },
      auth.principal,
      auth.ip
    );

    return new Response(JSON.stringify(createdTool), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to add tool' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
