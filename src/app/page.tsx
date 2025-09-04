'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileImage, Activity, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  isDicom: boolean;
  status: 'pending' | 'converting' | 'converted' | 'error';
  preview?: string;
}

interface ProcessingStatus {
  sessionId: string;
  totalBatches: number;
  currentBatch: number;
  processedImages: number;
  totalImages: number;
  status: 'uploading' | 'converting' | 'processing' | 'completed' | 'error';
  error?: string;
}

export default function RadiologistUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      isDicom: file.name.toLowerCase().endsWith('.dcm') || file.name.toLowerCase().endsWith('.dicom'),
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const startProcessing = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add files to FormData (we'll simulate this for now)
      files.forEach((file, index) => {
        // In a real implementation, you'd add the actual File objects
        formData.append(`file-${index}`, JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          isDicom: file.isDicom
        }));
      });

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Wait for upload to complete
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Start processing simulation
      const sessionId = `session-${Date.now()}`;
      const totalBatches = Math.ceil(files.length / 20);
      
      setProcessingStatus({
        sessionId,
        totalBatches,
        currentBatch: 0,
        processedImages: 0,
        totalImages: files.length,
        status: 'converting'
      });

      // Simulate DICOM conversion
      const dicomFiles = files.filter(f => f.isDicom);
      for (let i = 0; i < dicomFiles.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setFiles(prev => prev.map(f => 
          f.id === dicomFiles[i].id ? { ...f, status: 'converted' } : f
        ));
      }

      // Simulate batch processing
      setProcessingStatus(prev => prev ? { ...prev, status: 'processing' } : null);
      
      for (let batch = 1; batch <= totalBatches; batch++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate AI processing time
        
        setProcessingStatus(prev => prev ? {
          ...prev,
          currentBatch: batch,
          processedImages: Math.min(batch * 20, files.length)
        } : null);
      }

      // Complete processing
      setProcessingStatus(prev => prev ? { ...prev, status: 'completed' } : null);
      
      // Redirect to report after a short delay
      setTimeout(() => {
        router.push(`/report/${sessionId}`);
      }, 2000);

    } catch (error) {
      setProcessingStatus(prev => prev ? {
        ...prev,
        status: 'error',
        error: 'Failed to process images. Please try again.'
      } : null);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadProgress(0);
    setProcessingStatus(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Radiologist Diagnostic Platform
          </h1>
          <p className="text-lg text-gray-600">
            Upload medical images for AI-powered diagnostic analysis
          </p>
        </div>

        {/* Main Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-6 w-6" />
              Medical Image Upload
            </CardTitle>
            <CardDescription>
              Upload up to 200 medical images including DICOM files. Supported formats: DICOM (.dcm), PNG, JPG, JPEG
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isProcessing ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Drop your medical images here
                </h3>
                <p className="text-gray-600 mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  multiple
                  accept=".dcm,.dicom,.png,.jpg,.jpeg"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Browse Files
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload Progress */}
                {uploadProgress < 100 && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Uploading files...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {/* Processing Status */}
                {processingStatus && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500 animate-spin" />
                      <span className="font-medium">
                        {processingStatus.status === 'converting' && 'Converting DICOM files...'}
                        {processingStatus.status === 'processing' && 'Processing with AI...'}
                        {processingStatus.status === 'completed' && 'Analysis complete!'}
                        {processingStatus.status === 'error' && 'Processing failed'}
                      </span>
                    </div>

                    {processingStatus.status === 'processing' && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>
                            Batch {processingStatus.currentBatch} of {processingStatus.totalBatches}
                          </span>
                          <span>
                            {processingStatus.processedImages} / {processingStatus.totalImages} images
                          </span>
                        </div>
                        <Progress 
                          value={(processingStatus.processedImages / processingStatus.totalImages) * 100} 
                          className="w-full" 
                        />
                      </div>
                    )}

                    {processingStatus.status === 'completed' && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                          Diagnostic analysis completed successfully. Redirecting to report...
                        </AlertDescription>
                      </Alert>
                    )}

                    {processingStatus.status === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {processingStatus.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File List */}
        {files.length > 0 && !isProcessing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Uploaded Files ({files.length})</CardTitle>
              <CardDescription>
                Review your uploaded files before processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      {file.isDicom && (
                        <Badge variant="secondary">DICOM</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {files.length > 0 && !isProcessing && (
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={resetUpload}>
              Clear All
            </Button>
            <Button onClick={startProcessing} className="px-8">
              Start Diagnostic Analysis
            </Button>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">DICOM Support</h3>
              </div>
              <p className="text-sm text-gray-600">
                Automatic conversion of DICOM files to PNG format for AI analysis
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Batch Processing</h3>
              </div>
              <p className="text-sm text-gray-600">
                Intelligent batching of up to 20 images per AI analysis request
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">AI Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Powered by Claude Sonnet 4 for comprehensive diagnostic reports
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}