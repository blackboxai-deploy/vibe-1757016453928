'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileImage, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'converting' | 'converted' | 'error';
  isDicom: boolean;
  convertedBlob?: Blob;
  error?: string;
}

interface ImageUploadProps {
  onFilesReady: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export default function ImageUpload({ onFilesReady, maxFiles = 200 }: ImageUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'application/dicom',
    '.dcm',
    '.dicom'
  ];

  const isDicomFile = (file: File): boolean => {
    return file.name.toLowerCase().endsWith('.dcm') || 
           file.name.toLowerCase().endsWith('.dicom') ||
           file.type === 'application/dicom';
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (isDicomFile(file)) {
        resolve('/api/placeholder/150/150?text=DICOM');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertDicomToPng = async (file: File): Promise<Blob> => {
    const formData = new FormData();
    formData.append('dicom', file);

    const response = await fetch('/api/convert-dicom', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`DICOM conversion failed: ${response.statusText}`);
    }

    return response.blob();
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setConversionProgress(0);

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isDicom = isDicomFile(file);
      
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        file,
        status: 'pending',
        isDicom,
      };

      try {
        uploadedFile.preview = await createPreview(file);
        
        if (isDicom) {
          uploadedFile.status = 'converting';
          setUploadedFiles(prev => [...prev, uploadedFile]);
          
          const convertedBlob = await convertDicomToPng(file);
          uploadedFile.convertedBlob = convertedBlob;
          uploadedFile.status = 'converted';
          uploadedFile.preview = URL.createObjectURL(convertedBlob);
        } else {
          uploadedFile.status = 'converted';
        }
        
        newFiles.push(uploadedFile);
        
      } catch (error) {
        uploadedFile.status = 'error';
        uploadedFile.error = error instanceof Error ? error.message : 'Unknown error';
        newFiles.push(uploadedFile);
      }

      setConversionProgress(((i + 1) / files.length) * 100);
      setUploadedFiles(prev => {
        const updated = prev.map(f => f.id === uploadedFile.id ? uploadedFile : f);
        return updated.some(f => f.id === uploadedFile.id) ? updated : [...updated, uploadedFile];
      });
    }

    setIsProcessing(false);
    onFilesReady(newFiles.filter(f => f.status === 'converted'));
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = acceptedTypes.some(type => 
        type.startsWith('.') ? file.name.toLowerCase().endsWith(type) : file.type === type
      );
      return isValidType && file.size <= 50 * 1024 * 1024; // 50MB limit
    });

    if (validFiles.length + uploadedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. Please select fewer files.`);
      return;
    }

    if (validFiles.length > 0) {
      processFiles(validFiles);
    }
  }, [uploadedFiles.length, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      onFilesReady(updated.filter(f => f.status === 'converted'));
      return updated;
    });
  };

  const clearAll = () => {
    uploadedFiles.forEach(file => {
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setUploadedFiles([]);
    onFilesReady([]);
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'converting':
        return <Activity className="h-4 w-4 animate-spin text-blue-500" />;
      case 'converted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileImage className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'converting':
        return 'bg-blue-100 text-blue-800';
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const successfulUploads = uploadedFiles.filter(f => f.status === 'converted').length;
  const errorUploads = uploadedFiles.filter(f => f.status === 'error').length;
  const dicomFiles = uploadedFiles.filter(f => f.isDicom).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Medical Image Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop medical images here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports DICOM, PNG, JPEG, TIFF, BMP formats (max 50MB each)
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Maximum {maxFiles} files • DICOM files will be automatically converted to PNG
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mb-2"
            >
              Select Files
            </Button>
            {uploadedFiles.length > 0 && (
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={isProcessing}
                className="ml-2"
              >
                Clear All
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {isProcessing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Processing files...</span>
                <span>{Math.round(conversionProgress)}%</span>
              </div>
              <Progress value={conversionProgress} className="w-full" />
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div className="flex gap-2">
                  {successfulUploads > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {successfulUploads} Ready
                    </Badge>
                  )}
                  {dicomFiles > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {dicomFiles} DICOM
                    </Badge>
                  )}
                  {errorUploads > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {errorUploads} Errors
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                      {file.preview && (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium truncate" title={file.file.name}>
                        {file.file.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getStatusColor(file.status)}`}
                        >
                          {getStatusIcon(file.status)}
                          <span className="ml-1 capitalize">{file.status}</span>
                        </Badge>
                        {file.isDicom && (
                          <Badge variant="outline" className="text-xs">
                            DICOM
                          </Badge>
                        )}
                      </div>
                      {file.error && (
                        <p className="text-xs text-red-600 truncate" title={file.error}>
                          {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorUploads > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorUploads} file(s) failed to process. Please check the file formats and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}