"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, FileImage, Brain, Download } from 'lucide-react';

interface BatchStatus {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  imageCount: number;
  progress: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface ProcessingStats {
  totalImages: number;
  processedImages: number;
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  estimatedTimeRemaining: number;
  currentBatch?: number;
}

interface ProcessingDashboardProps {
  sessionId: string;
  onComplete?: (reportUrl: string) => void;
}

export default function ProcessingDashboard({ sessionId, onComplete }: ProcessingDashboardProps) {
  const [batches, setBatches] = useState<BatchStatus[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({
    totalImages: 0,
    processedImages: 0,
    totalBatches: 0,
    completedBatches: 0,
    failedBatches: 0,
    estimatedTimeRemaining: 0
  });
  const [isProcessing, setIsProcessing] = useState(true);
  const [reportReady, setReportReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${sessionId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsProcessing(false);
          return;
        }

        setBatches(data.batches || []);
        setStats(data.stats || stats);

        if (data.status === 'completed') {
          setIsProcessing(false);
          setReportReady(true);
          if (onComplete && data.reportUrl) {
            onComplete(data.reportUrl);
          }
        } else if (data.status === 'error') {
          setError(data.error || 'Processing failed');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
        setError('Failed to fetch processing status');
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial call

    return () => clearInterval(interval);
  }, [sessionId, onComplete]);

  const getStatusIcon = (status: BatchStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: BatchStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const overallProgress = stats.totalImages > 0 ? (stats.processedImages / stats.totalImages) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch(`/api/report/${sessionId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostic-report-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Diagnostic Analysis in Progress</h1>
        <p className="text-gray-600">Processing medical images with AI-powered analysis</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Overall Progress
          </CardTitle>
          <CardDescription>
            Processing {stats.totalImages} images across {stats.totalBatches} batches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Images Processed</span>
              <span>{stats.processedImages} / {stats.totalImages}</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(overallProgress)}% complete</span>
              {stats.estimatedTimeRemaining > 0 && (
                <span>~{formatTime(stats.estimatedTimeRemaining)} remaining</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedBatches}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.currentBatch ? 1 : 0}
              </div>
              <div className="text-sm text-gray-500">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failedBatches}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-purple-600" />
            Batch Processing Status
          </CardTitle>
          <CardDescription>
            Each batch contains up to 20 images for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Batch {batch.id}</h3>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(batch.status)}
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Images: {batch.imageCount}</span>
                    <span>{batch.progress}%</span>
                  </div>
                  <Progress value={batch.progress} className="h-2" />
                </div>

                {batch.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {batch.error}
                  </div>
                )}

                {batch.startTime && (
                  <div className="text-xs text-gray-500">
                    Started: {new Date(batch.startTime).toLocaleTimeString()}
                    {batch.endTime && (
                      <span className="block">
                        Completed: {new Date(batch.endTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Ready */}
      {reportReady && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Diagnostic Report Ready
            </CardTitle>
            <CardDescription className="text-green-700">
              AI analysis completed successfully. Your comprehensive diagnostic report is ready for download.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadReport} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Download Diagnostic Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium">AI Analysis in Progress...</span>
          </div>
          <p className="text-gray-500 mt-2">
            Please keep this page open while processing completes
          </p>
        </div>
      )}
    </div>
  );
}