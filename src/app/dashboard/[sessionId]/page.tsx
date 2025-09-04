'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface ProcessingStatus {
  success: boolean;
  sessionId: string;
  status: 'uploading' | 'converting' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    uploaded: number;
    converted: number;
    processed: number;
    currentBatch?: number;
    totalBatches?: number;
    completedBatches: number;
  };
  session: {
    sessionId: string;
    totalImages: number;
    processedImages: number;
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    startTime: string;
    endTime?: string;
    status: string;
  };
  batches: Array<{
    batchId: string;
    imageCount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processingTime?: number;
    error?: string;
  }>;
  finalReport?: {
    summary: string;
    findingsCount: number;
    recommendationsCount: number;
    generatedAt: string;
  };
}

export default function ProcessingDashboard() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Poll for status updates
  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/status/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setStatus(data);
          setError(null);
          setLastUpdated(new Date());
        } else {
          setError(data.error || 'Failed to fetch status');
        }
      } catch (err) {
        console.error('Status fetch error:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds while processing
    const interval = setInterval(() => {
      if (status?.status === 'processing' || status?.status === 'converting' || !status) {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, status?.status]);

  // Navigate to report when completed
  const viewReport = () => {
    router.push(`/report/${sessionId}`);
  };

  // Calculate progress percentage
  const getOverallProgress = (): number => {
    if (!status) return 0;
    
    const { progress } = status;
    if (progress.total === 0) return 0;
    
    // Weight different stages
    const uploadWeight = 0.1;  // 10%
    const convertWeight = 0.2; // 20%
    const processWeight = 0.7; // 70%
    
    const uploadProgress = (progress.uploaded / progress.total) * uploadWeight;
    const convertProgress = (progress.converted / progress.total) * convertWeight;
    const processProgress = (progress.processed / progress.total) * processWeight;
    
    return Math.round((uploadProgress + convertProgress + processProgress) * 100);
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.round((end.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes}m ${seconds}s`;
  };


  const getStatusBadgeVariant = (statusStr: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (statusStr) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Processing Dashboard</h1>
          </div>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error || 'Session not found'}
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Back to Upload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Processing Dashboard</h1>
          <p className="text-gray-600 mt-2">Session: {sessionId}</p>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Overall Progress
              <Badge variant={getStatusBadgeVariant(status.status)} className="ml-2">
                {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              </Badge>
            </CardTitle>
            <CardDescription>
              Processing {status.session.totalImages} medical images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Total Progress</span>
                  <span>{getOverallProgress()}%</span>
                </div>
                <Progress value={getOverallProgress()} className="w-full" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {status.progress.uploaded}
                  </div>
                  <div className="text-sm text-gray-600">Uploaded</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {status.progress.converted}
                  </div>
                  <div className="text-sm text-gray-600">Converted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {status.progress.processed}
                  </div>
                  <div className="text-sm text-gray-600">Analyzed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Processing Status</CardTitle>
            <CardDescription>
              {status.session.completedBatches} of {status.session.totalBatches} batches completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.batches.map((batch, index) => (
                <div key={batch.batchId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        Batch {index + 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        {batch.imageCount} images
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {batch.processingTime && (
                      <span className="text-xs text-gray-500">
                        {(batch.processingTime / 1000).toFixed(1)}s
                      </span>
                    )}
                    <Badge variant={getStatusBadgeVariant(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Information */}
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Start Time:</span>
                <div>{new Date(status.session.startTime).toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Duration:</span>
                <div>{formatDuration(status.session.startTime, status.session.endTime)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Images:</span>
                <div>{status.session.totalImages}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Failed Batches:</span>
                <div>{status.session.failedBatches}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Ready */}
        {status.status === 'completed' && status.finalReport && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Analysis Complete!</CardTitle>
              <CardDescription className="text-green-600">
                Diagnostic report is ready for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-700">Findings:</span>
                    <div>{status.finalReport.findingsCount}</div>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Recommendations:</span>
                    <div>{status.finalReport.recommendationsCount}</div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button onClick={viewReport} className="bg-green-600 hover:bg-green-700">
                    View Diagnostic Report
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/')}>
                    New Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {status.status === 'failed' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              Processing failed. Please try uploading your images again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}