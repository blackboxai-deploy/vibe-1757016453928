'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface BatchResult {
  batchId: string;
  imageCount: number;
  findings: string[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  processingTime: number;
  timestamp: string;
}

interface DiagnosticReportProps {
  sessionId: string;
  patientInfo?: {
    name?: string;
    id?: string;
    age?: number;
    gender?: string;
  };
  batchResults: BatchResult[];
  overallSummary: string;
  totalImages: number;
  processingStartTime: string;
  processingEndTime: string;
  radiologistNotes?: string;
}

const DiagnosticReport: React.FC<DiagnosticReportProps> = ({
  sessionId,
  patientInfo,
  batchResults,
  overallSummary,
  totalImages,
  processingStartTime,
  processingEndTime,
  radiologistNotes
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const totalProcessingTime = batchResults.reduce((sum, batch) => sum + batch.processingTime, 0);
  const highestUrgency = batchResults.reduce((max, batch) => {
    const urgencyLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return urgencyLevels[batch.urgency] > urgencyLevels[max] ? batch.urgency : max;
  }, 'low' as 'low' | 'medium' | 'high' | 'critical');

  const handleDownloadPDF = () => {
    // Implementation for PDF download
    console.log('Downloading PDF report for session:', sessionId);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Diagnostic Report</h1>
          <p className="text-gray-600">Session ID: {sessionId}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Patient Information */}
      {patientInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {patientInfo.name && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg">{patientInfo.name}</p>
                </div>
              )}
              {patientInfo.id && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Patient ID</p>
                  <p className="text-lg">{patientInfo.id}</p>
                </div>
              )}
              {patientInfo.age && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Age</p>
                  <p className="text-lg">{patientInfo.age} years</p>
                </div>
              )}
              {patientInfo.gender && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="text-lg">{patientInfo.gender}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Study Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Images</p>
              <p className="text-2xl font-bold">{totalImages}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Batches Processed</p>
              <p className="text-2xl font-bold">{batchResults.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Processing Time</p>
              <p className="text-2xl font-bold">{Math.round(totalProcessingTime / 60)}m</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Overall Priority</p>
              <Badge className={`${getUrgencyColor(highestUrgency)} flex items-center gap-1`}>
                {getUrgencyIcon(highestUrgency)}
                {highestUrgency.toUpperCase()}
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">Processing Started</p>
              <p>{new Date(processingStartTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Processing Completed</p>
              <p>{new Date(processingEndTime).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{overallSummary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Batch Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis by Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {batchResults.map((batch, index) => (
            <div key={batch.batchId} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  Batch {index + 1} ({batch.imageCount} images)
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className={getUrgencyColor(batch.urgency)}>
                    {getUrgencyIcon(batch.urgency)}
                    {batch.urgency.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {Math.round(batch.processingTime)}s
                  </span>
                </div>
              </div>

              {batch.findings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Key Findings:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {batch.findings.map((finding, idx) => (
                      <li key={idx} className="text-gray-700">{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {batch.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {batch.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                Processed: {new Date(batch.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Radiologist Notes */}
      {radiologistNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{radiologistNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-6 border-t">
        <p>This report was generated using AI-assisted diagnostic analysis.</p>
        <p>Please review all findings with appropriate clinical context.</p>
        <p className="mt-2">Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default DiagnosticReport;