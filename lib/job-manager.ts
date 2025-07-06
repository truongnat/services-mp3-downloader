export interface JobProgress {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  totalItems?: number;
  processedItems?: number;
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
}

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, JobProgress>();

export function createJob(jobId: string, message: string = 'Starting job...'): JobProgress {
  const job: JobProgress = {
    jobId,
    status: 'pending',
    progress: 0,
    message,
    startTime: Date.now()
  };
  
  jobs.set(jobId, job);
  return job;
}

export function updateJob(jobId: string, updates: Partial<JobProgress>): JobProgress | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  
  const updatedJob = { ...job, ...updates };
  jobs.set(jobId, updatedJob);
  return updatedJob;
}

export function getJob(jobId: string): JobProgress | null {
  return jobs.get(jobId) || null;
}

export function completeJob(jobId: string, result: any): JobProgress | null {
  return updateJob(jobId, {
    status: 'completed',
    progress: 100,
    message: 'Job completed successfully',
    endTime: Date.now(),
    result
  });
}

export function failJob(jobId: string, error: string): JobProgress | null {
  return updateJob(jobId, {
    status: 'failed',
    progress: 0,
    message: 'Job failed',
    endTime: Date.now(),
    error
  });
}

// Cleanup old jobs (older than 1 hour)
export function cleanupOldJobs() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [jobId, job] of jobs.entries()) {
    if (job.endTime && job.endTime < oneHourAgo) {
      jobs.delete(jobId);
    }
  }
}

// Auto cleanup every 30 minutes
setInterval(cleanupOldJobs, 30 * 60 * 1000);
