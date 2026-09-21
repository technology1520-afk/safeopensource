import type { APIRoute } from 'astro';
import { getAllTools } from '../../../utils/tools';
import type { ToolData } from '../../../types/tool';

export async function getStaticPaths() {
  const tools = getAllTools();
  return tools.map((tool) => ({
    params: { slug: tool.slug },
    props: { tool }
  }));
}

interface Props {
  tool: ToolData;
}

export const GET: APIRoute = ({ props }) => {
  const { tool } = props as Props;
  return new Response(JSON.stringify(tool, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
};

