"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Calendar, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface BatchResult {
  batchNumber: number;
  imageCount: number;
  findings: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  processingTime: number;
  status: 'completed' | 'failed' | 'partial';
}

interface DiagnosticReport {
  sessionId: string;
  patientId?: string;
  radiologistName?: string;
  studyDate: string;
  totalImages: number;
  processedImages: number;
  batchResults: BatchResult[];
  overallFindings: string[];
  clinicalRecommendations: string[];
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  processingStartTime: string;
  processingEndTime: string;
  totalProcessingTime: number;
  aiModel: string;
  reportGeneratedAt: string;
}

interface ReportViewerProps {
  report: DiagnosticReport;
  onDownloadPDF?: () => void;
  onExportData?: () => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'low': return <CheckCircle className="h-4 w-4" />;
    case 'medium': return <AlertTriangle className="h-4 w-4" />;
    case 'high': return <AlertTriangle className="h-4 w-4" />;
    case 'critical': return <XCircle className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'partial': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function ReportViewer({ report, onDownloadPDF, onExportData }: ReportViewerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Diagnostic Report</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(report.reportGeneratedAt)}
            </div>
            {report.radiologistName && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {report.radiologistName}
              </div>
            )}
            <Badge variant="outline">Session: {report.sessionId}</Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          {onDownloadPDF && (
            <Button onClick={onDownloadPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
          {onExportData && (
            <Button onClick={onExportData} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </div>
      </div>

      {/* Study Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Study Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Images</p>
              <p className="text-2xl font-bold">{report.totalImages}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Processed Images</p>
              <p className="text-2xl font-bold text-green-600">{report.processedImages}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Processing Time</p>
              <p className="text-2xl font-bold">{formatDuration(report.totalProcessingTime)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Overall Severity</p>
              <Badge className={`${getSeverityColor(report.overallSeverity)} flex items-center w-fit mt-1`}>
                {getSeverityIcon(report.overallSeverity)}
                <span className="ml-1 capitalize">{report.overallSeverity}</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Overall Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <ul className="space-y-2">
              {report.overallFindings.map((finding, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-gray-700">{finding}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Clinical Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Clinical Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <ul className="space-y-2">
              {report.clinicalRecommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Batch Results */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.batchResults.map((batch, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Batch {batch.batchNumber}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                    <Badge className={getSeverityColor(batch.severity)}>
                      {getSeverityIcon(batch.severity)}
                      <span className="ml-1 capitalize">{batch.severity}</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Images Processed</p>
                    <p className="font-semibold">{batch.imageCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processing Time</p>
                    <p className="font-semibold">{formatDuration(batch.processingTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Findings Count</p>
                    <p className="font-semibold">{batch.findings.length}</p>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Findings</h5>
                    <ScrollArea className="h-24">
                      <ul className="space-y-1 text-sm">
                        {batch.findings.map((finding, findingIndex) => (
                          <li key={findingIndex} className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span className="text-gray-600">{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Recommendations</h5>
                    <ScrollArea className="h-24">
                      <ul className="space-y-1 text-sm">
                        {batch.recommendations.map((recommendation, recIndex) => (
                          <li key={recIndex} className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span className="text-gray-600">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">AI Model</p>
              <p className="font-mono">{report.aiModel}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Processing Started</p>
              <p>{formatDate(report.processingStartTime)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Processing Completed</p>
              <p>{formatDate(report.processingEndTime)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Success Rate</p>
              <p>{((report.processedImages / report.totalImages) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}