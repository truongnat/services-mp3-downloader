import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-manager";

export const runtime = "nodejs";

// Get job status and progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const job = getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' }, 
      { status: 500 }
    );
  }
}
