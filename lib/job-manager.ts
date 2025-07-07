// Job management utilities for background processing

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: unknown;
  error?: string;
  totalItems?: number;
  processedItems?: number;
  createdAt: Date;
}

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, Job>();

export function generateJobId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: 'pending',
    progress: 0,
    message: 'Job created',
    createdAt: new Date()
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, updates);
    jobs.set(id, job);
  }
  return job;
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

// Clean up old jobs (older than 1 hour)
export function cleanupOldJobs(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [jobId, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(jobId);
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);
