import { NextRequest, NextResponse } from 'next/server';
import { DicomConverter } from '@/lib/dicom-converter';
import { BatchProcessor } from '@/lib/batch-processor';
import { DicomFile, ProcessedImage } from '@/types/medical';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file upload and processing...');
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No files provided' 
      }, { status: 400 });
    }

    if (files.length > 200) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum 200 files allowed' 
      }, { status: 400 });
    }

    console.log(`Processing ${files.length} files...`);

    // Process files: convert to DicomFile format and handle DICOM conversion
    const processedImages: ProcessedImage[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Get file info from form data
        const fileInfoStr = formData.get(`fileInfo_${i}`) as string;
        const fileInfo = fileInfoStr ? JSON.parse(fileInfoStr) : { 
          id: `file_${Date.now()}_${i}`,
          isDicom: file.name.toLowerCase().endsWith('.dcm') || file.name.toLowerCase().endsWith('.dicom'),
          originalName: file.name
        };

        console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (DICOM: ${fileInfo.isDicom})`);

        const fileBuffer = await file.arrayBuffer();

        if (fileInfo.isDicom) {
          // Convert DICOM to PNG
          const dicomFile: DicomFile = {
            id: fileInfo.id,
            originalName: file.name,
            buffer: fileBuffer,
            size: file.size
          };

          // Validate DICOM file
          if (!DicomConverter.isDicomFile(fileBuffer)) {
            console.warn(`File ${file.name} is not a valid DICOM file, treating as regular image`);
            fileInfo.isDicom = false;
          } else {
            const convertedImage = await DicomConverter.convertDicomToPng(dicomFile);
            processedImages.push(convertedImage);
            continue;
          }
        }

        // Handle regular image files
        if (!fileInfo.isDicom) {
          // Validate image file type
          const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/tiff'];
          if (!validImageTypes.includes(file.type) && !file.name.match(/\.(png|jpg|jpeg|bmp|tiff)$/i)) {
            errors.push(`${file.name}: Unsupported file type`);
            continue;
          }

          // Convert to base64 for AI processing
          const uint8Array = new Uint8Array(fileBuffer);
          const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
          const base64Data = `data:${file.type};base64,${btoa(binaryString)}`;
          
          processedImages.push({
            id: fileInfo.id,
            originalName: file.name,
            convertedPath: `original/${fileInfo.id}`,
            base64Data,
            conversionStatus: 'success'
          });
        }

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`${file.name}: Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Successfully processed ${processedImages.length} files, ${errors.length} errors`);

    if (processedImages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No files could be processed successfully',
        details: errors
      }, { status: 400 });
    }

    // Create processing session
    const batchProcessor = new BatchProcessor();
    const session = batchProcessor.createSession(processedImages);
    
    console.log(`Created session ${session.sessionId} with ${session.batches.length} batches`);

    // Start async processing (don't await - let it run in background)
    processImagesAsync(session.sessionId, batchProcessor).catch(error => {
      console.error('Async processing error:', error);
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      totalFiles: files.length,
      processedFiles: processedImages.length,
      batches: session.batches.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${processedImages.length} files. Processing started.`
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

// Async function to process images in the background
async function processImagesAsync(sessionId: string, batchProcessor: BatchProcessor) {
  try {
    console.log(`Starting async processing for session ${sessionId}`);
    const report = await batchProcessor.processSession(sessionId);
    
    if (report) {
      console.log(`Session ${sessionId} completed successfully`);
    } else {
      console.error(`Session ${sessionId} processing failed`);
    }
  } catch (error) {
    console.error(`Async processing failed for session ${sessionId}:`, error);
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}