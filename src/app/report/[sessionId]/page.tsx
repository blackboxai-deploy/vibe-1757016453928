'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface DiagnosticFinding {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  confidence: number;
}

interface BatchReport {
  batchId: string;
  imageCount: number;
  findings: string;
  keyObservations: string[];
  processingTime: number;
}

interface PatientInfo {
  name?: string;
  id?: string;
  studyDate?: string;
}

interface DiagnosticReport {
  sessionId: string;
  patientInfo?: PatientInfo;
  summary: string;
  findings: DiagnosticFinding[];
  recommendations: string[];
  batchReports: BatchReport[];
  generatedAt: string;
  statistics: {
    totalImages: number;
    totalBatches: number;
    totalProcessingTime: number;
    findingsBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

interface ReportResponse {
  success: boolean;
  report: DiagnosticReport;
  error?: string;
}

export default function DiagnosticReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [reportData, setReportData] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/report/${sessionId}`);
        const data: ReportResponse = await response.json();
        
        if (data.success && data.report) {
          setReportData(data.report);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch report');
        }
      } catch (err) {
        console.error('Report fetch error:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatProcessingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
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
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Diagnostic Report</h1>
          </div>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error || 'Report not found'}
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center space-x-3">
            <Button onClick={() => router.push(`/dashboard/${sessionId}`)} variant="outline">
              Back to Dashboard
            </Button>
            <Button onClick={() => router.push('/')} variant="outline">
              New Analysis
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Diagnostic Report</h1>
          <p className="text-gray-600">
            Generated on {new Date(reportData.generatedAt).toLocaleDateString()} at {new Date(reportData.generatedAt).toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-500">Session ID: {reportData.sessionId}</p>
        </div>

        {/* Patient Information */}
        {reportData.patientInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportData.patientInfo.name && (
                  <div>
                    <span className="font-medium text-gray-600">Patient Name:</span>
                    <div>{reportData.patientInfo.name}</div>
                  </div>
                )}
                {reportData.patientInfo.id && (
                  <div>
                    <span className="font-medium text-gray-600">Patient ID:</span>
                    <div>{reportData.patientInfo.id}</div>
                  </div>
                )}
                {reportData.patientInfo.studyDate && (
                  <div>
                    <span className="font-medium text-gray-600">Study Date:</span>
                    <div>{reportData.patientInfo.studyDate}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.statistics.totalImages}</div>
              <div className="text-sm text-gray-600">Images Analyzed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{reportData.findings.length}</div>
              <div className="text-sm text-gray-600">Total Findings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reportData.statistics.findingsBreakdown.critical + reportData.statistics.findingsBreakdown.high}
              </div>
              <div className="text-sm text-gray-600">Significant Findings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatProcessingTime(reportData.statistics.totalProcessingTime)}
              </div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {reportData.summary}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="findings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="findings">Findings ({reportData.findings.length})</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations ({reportData.recommendations.length})</TabsTrigger>
                <TabsTrigger value="batches">Batch Details ({reportData.batchReports.length})</TabsTrigger>
              </TabsList>

              {/* Findings Tab */}
              <TabsContent value="findings" className="mt-6">
                <div className="space-y-4">
                  {/* Findings Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">
                        {reportData.statistics.findingsBreakdown.critical}
                      </div>
                      <div className="text-sm text-red-700">Critical</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <div className="text-lg font-bold text-orange-600">
                        {reportData.statistics.findingsBreakdown.high}
                      </div>
                      <div className="text-sm text-orange-700">High</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <div className="text-lg font-bold text-yellow-600">
                        {reportData.statistics.findingsBreakdown.medium}
                      </div>
                      <div className="text-sm text-yellow-700">Medium</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">
                        {reportData.statistics.findingsBreakdown.low}
                      </div>
                      <div className="text-sm text-green-700">Low</div>
                    </div>
                  </div>

                  {/* Findings List */}
                  {reportData.findings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No specific findings identified
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reportData.findings.map((finding, index) => (
                        <Card key={index} className={`border-l-4 ${getSeverityColor(finding.severity)}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant={getSeverityBadgeVariant(finding.severity)}>
                                  {finding.severity.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-medium text-gray-600">
                                  {finding.category}
                                </span>
                                {finding.location && (
                                  <span className="text-sm text-gray-500">
                                    • {finding.location}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {finding.confidence}% confidence
                              </div>
                            </div>
                            <p className="text-gray-700">{finding.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="mt-6">
                <div className="space-y-3">
                  {reportData.recommendations.map((recommendation, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                          <p className="text-gray-700 flex-1">{recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Batch Details Tab */}
              <TabsContent value="batches" className="mt-6">
                <div className="space-y-4">
                  {reportData.batchReports.map((batch, index) => (
                    <Card key={batch.batchId}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Batch {index + 1}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {batch.imageCount} images
                            </Badge>
                            <Badge variant="secondary">
                              {(batch.processingTime / 1000).toFixed(1)}s
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {batch.keyObservations.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Key Observations:</h4>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {batch.keyObservations.map((observation, obsIndex) => (
                                  <li key={obsIndex}>{observation}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Detailed Analysis:</h4>
                            <div className="text-gray-700 whitespace-pre-line text-sm bg-gray-50 p-3 rounded">
                              {batch.findings}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button onClick={() => router.push(`/dashboard/${sessionId}`)} variant="outline">
            View Dashboard
          </Button>
          <Button onClick={() => router.push('/')} variant="outline">
            New Analysis
          </Button>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
            Print Report
          </Button>
        </div>

        {/* Footer Disclaimer */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Important Medical Disclaimer</h3>
            <p className="text-sm text-yellow-700">
              This automated analysis is for educational and reference purposes only. All findings must be reviewed and validated by a qualified radiologist. 
              Clinical correlation is required for all identified abnormalities. This report does not constitute a medical diagnosis and should not be used 
              as the sole basis for medical decisions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}