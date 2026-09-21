import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface PipelineJob {
  id: string;
  type: 'rescan' | 'rebuild';
  target: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  principal: 'owner' | 'agent';
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.jsonl');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// In-memory cache of recent jobs
const jobsCache = new Map<string, PipelineJob>();

export function createJob(
  type: 'rescan' | 'rebuild',
  target: string,
  principal: 'owner' | 'agent'
): PipelineJob {
  ensureDataDir();
  const id = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const job: PipelineJob = {
    id,
    type,
    target,
    status: 'queued',
    principal,
    createdAt: now,
    updatedAt: now,
  };

  jobsCache.set(id, job);
  fs.appendFileSync(JOBS_FILE, JSON.stringify(job) + '\n', 'utf-8');
  return job;
}

export function updateJob(
  id: string,
  updates: Partial<Pick<PipelineJob, 'status' | 'result' | 'error'>>
): PipelineJob | null {
  const job = jobsCache.get(id) || getJob(id);
  if (!job) return null;

  Object.assign(job, updates);
  job.updatedAt = new Date().toISOString();
  jobsCache.set(id, job);

  // Append updated state to job log
  ensureDataDir();
  fs.appendFileSync(JOBS_FILE, JSON.stringify(job) + '\n', 'utf-8');
  return job;
}

export function getJob(id: string): PipelineJob | null {
  if (jobsCache.has(id)) {
    return jobsCache.get(id)!;
  }

  ensureDataDir();
  if (!fs.existsSync(JOBS_FILE)) return null;

  try {
    const lines = fs.readFileSync(JOBS_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (item.id === id) {
          jobsCache.set(id, item);
          return item;
        }
      } catch {
        // Continue
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function listRecentJobs(limit = 15): PipelineJob[] {
  ensureDataDir();
  if (!fs.existsSync(JOBS_FILE)) return Array.from(jobsCache.values()).slice(-limit).reverse();

  try {
    const lines = fs.readFileSync(JOBS_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    const seen = new Set<string>();
    const jobs: PipelineJob[] = [];

    for (let i = lines.length - 1; i >= 0 && jobs.length < limit; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (!seen.has(item.id)) {
          seen.add(item.id);
          jobs.push(item);
        }
      } catch {
        // Continue
      }
    }
    return jobs;
  } catch {
    return Array.from(jobsCache.values()).slice(-limit).reverse();
  }
}
