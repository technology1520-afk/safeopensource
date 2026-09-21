import type { APIRoute } from 'astro';
import { getScanJob } from '../../../lib/scanner/pipeline';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Job ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const job = getScanJob(id);

  if (!job) {
    return new Response(
      JSON.stringify({ error: `Scan job "${id}" not found or expired.` }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify(job), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};

