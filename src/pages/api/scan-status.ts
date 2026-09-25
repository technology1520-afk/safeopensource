import type { APIRoute } from 'astro';
import { getActiveScanQueueDepth } from '../../lib/scanner/rate-limiter';
import { listRecentJobs } from '../../lib/admin/jobs';
import { getTelemetryStats } from '../../utils/telemetry';

export const prerender = false;

export const GET: APIRoute = async () => {
  const queueDepth = getActiveScanQueueDepth();
  const adminJobs = listRecentJobs(5);

  const activeAdminJob = adminJobs.find(
    (j) => j.status === 'running' || j.status === 'queued'
  );

  const isScanning = Boolean(queueDepth > 0 || activeAdminJob);
  const telemetry = getTelemetryStats();

  return new Response(
    JSON.stringify({
      state: isScanning ? 'SCANNING' : 'NOMINAL',
      isScanning,
      activeJobTarget: activeAdminJob?.target || null,
      queueDepth,
      lastSweepTimestamp: telemetry.latestSweepTimestamp,
      checkedAt: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
};
