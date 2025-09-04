"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

export interface BatchInfo {
  id: string;
  batchNumber: number;
  totalBatches: number;
  imageCount: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  images: string[];
}

interface BatchStatusProps {
  batches: BatchInfo[];
  overallProgress: number;
  currentBatch?: number;
  totalImages: number;
  processedImages: number;
}

const BatchStatus: React.FC<BatchStatusProps> = ({
  batches,
  overallProgress,
  currentBatch,
  totalImages,
  processedImages
}) => {
  const getStatusIcon = (status: BatchInfo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: BatchInfo['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return '';
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Progress</span>
            <Badge variant="outline" className="text-sm">
              {processedImages} / {totalImages} images
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{Math.round(overallProgress)}% Complete</span>
              <span>
                {batches.filter(b => b.status === 'completed').length} / {batches.length} batches processed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Details */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  batch.batchNumber === currentBatch
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(batch.status)}
                    <div>
                      <h4 className="font-medium">
                        Batch {batch.batchNumber} of {batch.totalBatches}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {batch.imageCount} images
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                    </Badge>
                    {batch.startTime && (
                      <span className="text-xs text-gray-500">
                        {formatDuration(batch.startTime, batch.endTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar for Current Batch */}
                {batch.status === 'processing' && (
                  <div className="mb-3">
                    <Progress value={batch.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Processing images...</span>
                      <span>{Math.round(batch.progress)}%</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {batch.status === 'error' && batch.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {batch.errorMessage}
                  </div>
                )}

                {/* Image Thumbnails */}
                {batch.images.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {batch.images.slice(0, 10).map((imageUrl, index) => (
                        <div
                          key={index}
                          className="w-12 h-12 rounded border overflow-hidden bg-gray-100"
                        >
                          <img
                            src={imageUrl}
                            alt={`Batch ${batch.batchNumber} Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-medical.png';
                            }}
                          />
                        </div>
                      ))}
                      {batch.images.length > 10 && (
                        <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                          +{batch.images.length - 10}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {batches.filter(b => b.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {batches.filter(b => b.status === 'processing').length}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {batches.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {batches.filter(b => b.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchStatus;