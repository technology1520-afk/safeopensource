#!/usr/bin/env node

/**
 * SafeOpenSource Model Context Protocol (MCP) Server
 * Exposes the /admin control plane API as standard MCP tools
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
  version: '2.0.0',
});

// Tool 1: sos_status
server.registerTool(
  'sos_status',
  {
    description: 'Fetch real-time pipeline health, tool counts (listed/unlisted/flagged), last sweep timestamp, and pending approval queue.',
  },
  async () => {
    try {
      const res = await callAdminApi('/status', 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Failed to fetch status' }],
      };
    }
  }
);

// Tool 2: sos_rescan
server.registerTool(
  'sos_rescan',
  {
    description: 'Trigger security scorecard and telemetry sweep for one or all open-source repositories.',
    inputSchema: {
      repos: z.array(z.string()).optional().describe('Array of tool slugs/repos to rescan, or empty array to rescan all repositories.'),
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

// Tool 3: sos_add_tool
server.registerTool(
  'sos_add_tool',
  {
    description: 'Enroll a new open-source repository into continuous security monitoring, compute initial safety score, and generate a draft report. Lands in queue as unlisted.',
    inputSchema: {
      repo_url: z.string().describe('GitHub repository path or URL (e.g. "owner/repo" or "https://github.com/owner/repo").'),
      category: z.string().describe('Category slug (e.g. "monitoring-status", "cloud-storage", "password-auth", "ai-agents").'),
      name: z.string().optional().describe('Optional human display name.'),
      tagline: z.string().optional().describe('Optional brief tagline description.'),
    },
  },
  async ({ repo_url, category, name, tagline }) => {
    try {
      const res = await callAdminApi('/tools', 'POST', { repo_url, category, name, tagline });
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

// Tool 4: sos_edit_tool
server.registerTool(
  'sos_edit_tool',
  {
    description: 'Update human-written fields for a repository (tagline, name, category, use_cases, requirements, who_for, website_url). Scores are pipeline-owned; attempts to alter scores are rejected with 422.',
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

// Tool 5: sos_approve
server.registerTool(
  'sos_approve',
  {
    description: 'Approve a tool in the review queue to make it public and listed in the catalog.',
    inputSchema: {
      tool_id: z.string().describe('Slug or repository name of the tool to approve.'),
    },
  },
  async ({ tool_id }) => {
    try {
      const res = await callAdminApi(`/queue/${tool_id}/approve`, 'POST');
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Approval failed' }],
      };
    }
  }
);

// Tool 6: sos_reject
server.registerTool(
  'sos_reject',
  {
    description: 'Reject and delete a tool from the queue or catalog.',
    inputSchema: {
      tool_id: z.string().describe('Slug or repository name of the tool to reject.'),
      reason: z.string().optional().describe('Optional explanation for audit log.'),
    },
  },
  async ({ tool_id, reason }) => {
    try {
      const res = await callAdminApi(`/queue/${tool_id}/reject`, 'POST', { reason });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Rejection failed' }],
      };
    }
  }
);

// Tool 7: sos_rebuild
server.registerTool(
  'sos_rebuild',
  {
    description: 'Trigger static site rebuild and deployment via deploy.sh.',
  },
  async () => {
    try {
      const res = await callAdminApi('/rebuild', 'POST');
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Rebuild trigger failed' }],
      };
    }
  }
);

// Tool 8: sos_audit
server.registerTool(
  'sos_audit',
  {
    description: 'Query the append-only audit log to review recent operator and agent actions.',
    inputSchema: {
      limit: z.number().optional().describe('Maximum number of entries to retrieve (default 20).'),
    },
  },
  async ({ limit = 20 }) => {
    try {
      const res = await callAdminApi(`/audit?limit=${limit}`, 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message || 'Audit query failed' }],
      };
    }
  }
);

// Backwards-compatible alias for sos_update_content
server.registerTool(
  'sos_update_content',
  {
    description: 'Alias for sos_edit_tool: Update human-written fields for a repository.',
    inputSchema: {
      repo: z.string().describe('Target repository slug or name.'),
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[SafeOpenSource MCP] Fatal startup error:', err);
  process.exit(1);
});
