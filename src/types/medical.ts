export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyTime?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  institutionName?: string;
  manufacturerModelName?: string;
  sliceThickness?: number;
  pixelSpacing?: number[];
  imagePosition?: number[];
  imageOrientation?: number[];
  windowCenter?: number;
  windowWidth?: number;
}

export interface MedicalImage {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  isDicom: boolean;
  convertedPath?: string;
  thumbnailPath?: string;
  dicomMetadata?: DicomMetadata;
  uploadedAt: Date;
  status: 'uploaded' | 'converting' | 'converted' | 'processing' | 'processed' | 'error';
  errorMessage?: string;
}

export interface ProcessingBatch {
  id: string;
  sessionId: string;
  batchNumber: number;
  images: MedicalImage[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  aiResponse?: string;
  errorMessage?: string;
}

export interface DiagnosticReport {
  id: string;
  sessionId: string;
  patientInfo?: {
    name?: string;
    id?: string;
    studyDate?: string;
  };
  summary: string;
  findings: DiagnosticFinding[];
  recommendations: string[];
  batchReports: BatchReport[];
  totalImages: number;
  processedImages: number;
  createdAt: Date;
  status: 'generating' | 'completed' | 'error';
}

export interface DiagnosticFinding {
  category: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  location?: string;
  confidence: number;
  relatedImages: string[];
}

export interface BatchReport {
  batchNumber: number;
  imageCount: number;
  findings: string;
  keyObservations: string[];
  processedAt: Date;
}

export interface ProcessingSession {
  id: string;
  totalImages: number;
  processedImages: number;
  totalBatches: number;
  completedBatches: number;
  currentBatch?: number;
  status: 'uploading' | 'converting' | 'processing' | 'completed' | 'error';
  startedAt: Date;
  completedAt?: Date;
  images: MedicalImage[];
  batches: ProcessingBatch[];
  report?: DiagnosticReport;
  errorMessage?: string;
}

export interface UploadProgress {
  sessionId: string;
  uploadedFiles: number;
  totalFiles: number;
  convertedFiles: number;
  currentFile?: string;
  status: 'uploading' | 'converting' | 'ready';
}

export interface AIProcessingRequest {
  images: {
    id: string;
    base64Data: string;
    metadata?: DicomMetadata;
  }[];
  prompt: string;
  batchNumber: number;
  sessionId: string;
}

export interface AIProcessingResponse {
  success: boolean;
  response?: string;
  error?: string;
  batchNumber: number;
  sessionId: string;
  processedAt: Date;
}

export interface ConversionResult {
  success: boolean;
  originalPath: string;
  convertedPath?: string;
  thumbnailPath?: string;
  metadata?: DicomMetadata;
  error?: string;
}

export type ImageFormat = 'dicom' | 'png' | 'jpg' | 'jpeg' | 'tiff' | 'bmp';

export interface FileValidationResult {
  isValid: boolean;
  format: ImageFormat;
  isMedicalImage: boolean;
  error?: string;
}