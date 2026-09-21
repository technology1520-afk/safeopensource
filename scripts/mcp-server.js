#!/usr/bin/env node

/**
 * SafeOpenSource MCP Server
 * Exposes the /admin control plane API as Model Context Protocol tools
 * for autonomous AI agent operation.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const ADMIN_API_URL = (process.env.ADMIN_API_URL || 'http://localhost:4321/admin/api').replace(/\/$/, '');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('[SafeOpenSource MCP] WARNING: ADMIN_API_KEY environment variable is not set.');
}

async function callAdminApi(endpoint, method = 'GET', body = null) {
  const url = `${ADMIN_API_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${ADMIN_API_KEY || ''}`,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body && ['POST', 'PATCH', 'PUT'].includes(method)) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Admin API error (${response.status}): ${text || response.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const server = new McpServer({
  name: 'safeopensource-control-plane',
  version: '1.0.0',
});

// Tool 1: sos_rescan
server.registerTool(
  'sos_rescan',
  {
    description: 'Trigger security scorecard and telemetry sweep for one or all open-source repositories.',
    inputSchema: {
      repos: z.array(z.string()).optional().describe('Array of tool slugs to rescan, or empty array to rescan all repositories.'),
    },
  },
  async ({ repos = [] }) => {
    try {
      if (repos.length === 0) {
        const res = await callAdminApi('/rescan', 'POST', { repo: 'all' });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      }

      const results = [];
      for (const repo of repos) {
        const res = await callAdminApi('/rescan', 'POST', { repo });
        results.push(res);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Rescan failed' }],
      };
    }
  }
);

// Tool 2: sos_add_tool
server.registerTool(
  'sos_add_tool',
  {
    description: 'Enroll a new open-source repository into continuous security monitoring, compute initial safety score, and generate a draft AI report.',
    inputSchema: {
      repo: z.string().describe('GitHub repository path (e.g. "owner/repo" or "https://github.com/owner/repo").'),
      category: z.string().describe('Category slug (e.g. "monitoring-status", "cloud-storage", "password-auth").'),
      name: z.string().optional().describe('Optional human display name.'),
    },
  },
  async ({ repo, category, name }) => {
    try {
      const res = await callAdminApi('/tools', 'POST', { repo, category, name });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Failed to add tool' }],
      };
    }
  }
);

// Tool 3: sos_update_content
server.registerTool(
  'sos_update_content',
  {
    description: 'Update human-written fields for a repository (tagline, use_cases, requirements, who_for, website_url). Scores remain strictly pipeline-owned.',
    inputSchema: {
      repo: z.string().describe('Target repository slug or name (e.g. "uptime-kuma").'),
      fields: z.record(z.any()).describe('Dictionary of human-written fields to update.'),
    },
  },
  async ({ repo, fields }) => {
    try {
      const res = await callAdminApi(`/tools/${repo}`, 'PATCH', fields);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Update failed' }],
      };
    }
  }
);

// Tool 4: sos_status
server.registerTool(
  'sos_status',
  {
    description: 'Fetch real-time pipeline telemetry, last sweep timestamp, upstream API budgets, and flagged tools summary.',
  },
  async () => {
    try {
      const health = await callAdminApi('/health', 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Failed to fetch status' }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[SafeOpenSource MCP] Fatal startup error:', err);
  process.exit(1);
});
