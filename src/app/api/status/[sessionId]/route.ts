import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface ProcessingStatus {
  sessionId: string;
  status: 'uploading' | 'converting' | 'processing' | 'completed' | 'error';
  totalImages: number;
  processedImages: number;
  currentBatch: number;
  totalBatches: number;
  completedBatches: number;
  errors: string[];
  startTime: string;
  endTime?: string;
  progress: number;
  message: string;
  convertedImages: number;
  failedConversions: number;
  aiProcessingResults: any[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Try to read status file from temp directory
    const statusFilePath = join(process.cwd(), 'temp', `${sessionId}_status.json`);
    
    try {
      const statusData = await readFile(statusFilePath, 'utf-8');
      const status: ProcessingStatus = JSON.parse(statusData);
      
      return NextResponse.json(status);
    } catch (fileError) {
      // If status file doesn't exist, return default status
      const defaultStatus: ProcessingStatus = {
        sessionId,
        status: 'error',
        totalImages: 0,
        processedImages: 0,
        currentBatch: 0,
        totalBatches: 0,
        completedBatches: 0,
        errors: ['Session not found or expired'],
        startTime: new Date().toISOString(),
        progress: 0,
        message: 'Session not found',
        convertedImages: 0,
        failedConversions: 0,
        aiProcessingResults: []
      };

      return NextResponse.json(defaultStatus, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const updates = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const statusFilePath = join(process.cwd(), 'temp', `${sessionId}_status.json`);
    
    let currentStatus: ProcessingStatus;
    
    try {
      const statusData = await readFile(statusFilePath, 'utf-8');
      currentStatus = JSON.parse(statusData);
    } catch {
      // Create new status if doesn't exist
      currentStatus = {
        sessionId,
        status: 'uploading',
        totalImages: 0,
        processedImages: 0,
        currentBatch: 0,
        totalBatches: 0,
        completedBatches: 0,
        errors: [],
        startTime: new Date().toISOString(),
        progress: 0,
        message: 'Initializing...',
        convertedImages: 0,
        failedConversions: 0,
        aiProcessingResults: []
      };
    }

    // Update status with provided updates
    const updatedStatus = { ...currentStatus, ...updates };
    
    // Calculate progress based on status
    if (updatedStatus.totalImages > 0) {
      switch (updatedStatus.status) {
        case 'uploading':
          updatedStatus.progress = 10;
          break;
        case 'converting':
          updatedStatus.progress = 20 + (updatedStatus.convertedImages / updatedStatus.totalImages) * 30;
          break;
        case 'processing':
          updatedStatus.progress = 50 + (updatedStatus.completedBatches / updatedStatus.totalBatches) * 40;
          break;
        case 'completed':
          updatedStatus.progress = 100;
          updatedStatus.endTime = new Date().toISOString();
          break;
        case 'error':
          updatedStatus.progress = Math.max(updatedStatus.progress, 0);
          break;
      }
    }

    // Write updated status back to file
    const { writeFile, mkdir } = await import('fs/promises');
    const tempDir = join(process.cwd(), 'temp');
    
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (mkdirError) {
      // Directory might already exist
    }
    
    await writeFile(statusFilePath, JSON.stringify(updatedStatus, null, 2));

    return NextResponse.json(updatedStatus);
  } catch (error) {
    console.error('Error updating processing status:', error);
    return NextResponse.json(
      { error: 'Failed to update processing status' },
      { status: 500 }
    );
  }
}