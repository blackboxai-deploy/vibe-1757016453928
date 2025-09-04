import { NextRequest, NextResponse } from 'next/server';
import { BatchProcessor } from '@/lib/batch-processor';

// Create a global batch processor instance
let globalBatchProcessor: BatchProcessor | null = null;

function getBatchProcessor(): BatchProcessor {
  if (!globalBatchProcessor) {
    globalBatchProcessor = new BatchProcessor();
  }
  return globalBatchProcessor;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID required' 
      }, { status: 400 });
    }

    const batchProcessor = getBatchProcessor();
    const session = batchProcessor.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 });
    }

    if (!session.finalReport) {
      return NextResponse.json({ 
        success: false, 
        error: 'Report not ready yet. Processing may still be in progress.' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report: {
        sessionId: session.finalReport.sessionId,
        patientInfo: session.finalReport.patientInfo,
        summary: session.finalReport.summary,
        findings: session.finalReport.findings,
        recommendations: session.finalReport.recommendations,
        batchReports: session.finalReport.batchReports.map(batch => ({
          batchId: batch.batchId,
          imageCount: batch.imageCount,
          findings: batch.findings,
          keyObservations: batch.keyObservations,
          processingTime: batch.processingTime
        })),
        generatedAt: session.finalReport.generatedAt,
        statistics: {
          totalImages: session.totalImages,
          totalBatches: session.batches.length,
          totalProcessingTime: session.endTime && session.startTime 
            ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
            : 0,
          findingsBreakdown: {
            critical: session.finalReport.findings.filter(f => f.severity === 'critical').length,
            high: session.finalReport.findings.filter(f => f.severity === 'high').length,
            medium: session.finalReport.findings.filter(f => f.severity === 'medium').length,
            low: session.finalReport.findings.filter(f => f.severity === 'low').length
          }
        }
      }
    });

  } catch (error) {
    console.error('Report endpoint error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}