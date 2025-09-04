import { NextRequest, NextResponse } from 'next/server';
import * as dicomParser from 'dicom-parser';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if file is DICOM
    if (!file.name.toLowerCase().endsWith('.dcm') && !file.name.toLowerCase().endsWith('.dicom')) {
      return NextResponse.json({ error: 'File is not a DICOM file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    try {
      // Parse DICOM file
      const dataSet = dicomParser.parseDicom(byteArray);
      
      // Extract pixel data
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        return NextResponse.json({ error: 'No pixel data found in DICOM file' }, { status: 400 });
      }

      // Get image dimensions
      const rows = dataSet.uint16('x00280010');
      const columns = dataSet.uint16('x00280011');
      const samplesPerPixel = dataSet.uint16('x00280002') || 1;
      const bitsAllocated = dataSet.uint16('x00280100') || 16;
      const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';

      if (!rows || !columns) {
        return NextResponse.json({ error: 'Invalid DICOM dimensions' }, { status: 400 });
      }

      // Extract pixel data
      const pixelData = new Uint8Array(
        dataSet.byteArray.buffer,
        pixelDataElement.dataOffset,
        pixelDataElement.length
      );

      let imageBuffer: Buffer;

      if (bitsAllocated === 16) {
        // Convert 16-bit to 8-bit for PNG
        const pixelArray = new Uint16Array(pixelData.buffer, pixelData.byteOffset, pixelData.length / 2);
        const normalizedPixels = new Uint8Array(pixelArray.length);
        
        // Find min/max for normalization
        let min = pixelArray[0];
        let max = pixelArray[0];
        for (let i = 1; i < pixelArray.length; i++) {
          if (pixelArray[i] < min) min = pixelArray[i];
          if (pixelArray[i] > max) max = pixelArray[i];
        }
        
        // Normalize to 0-255 range
        const range = max - min;
        for (let i = 0; i < pixelArray.length; i++) {
          normalizedPixels[i] = range > 0 ? Math.round(((pixelArray[i] - min) / range) * 255) : 0;
        }
        
        imageBuffer = Buffer.from(normalizedPixels);
      } else {
        imageBuffer = Buffer.from(pixelData);
      }

      // Convert to PNG using Sharp
      const pngBuffer = await sharp(imageBuffer, {
        raw: {
          width: columns,
          height: rows,
          channels: samplesPerPixel
        }
      })
      .png()
      .toBuffer();

      // Extract metadata
      const metadata = {
        patientName: dataSet.string('x00100010') || 'Unknown',
        patientId: dataSet.string('x00100020') || 'Unknown',
        studyDate: dataSet.string('x00080020') || 'Unknown',
        modality: dataSet.string('x00080060') || 'Unknown',
        studyDescription: dataSet.string('x00081030') || 'Unknown',
        seriesDescription: dataSet.string('x0008103e') || 'Unknown',
        institutionName: dataSet.string('x00080080') || 'Unknown',
        rows,
        columns,
        bitsAllocated,
        photometricInterpretation
      };

      // Return PNG as base64 with metadata
      const base64Image = pngBuffer.toString('base64');
      
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${base64Image}`,
        metadata,
        originalFilename: file.name,
        convertedSize: pngBuffer.length
      });

    } catch (dicomError) {
      console.error('DICOM parsing error:', dicomError);
      return NextResponse.json({ 
        error: 'Failed to parse DICOM file', 
        details: dicomError instanceof Error ? dicomError.message : 'Unknown error'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('DICOM conversion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during DICOM conversion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'DICOM conversion endpoint',
    usage: 'POST with multipart/form-data containing DICOM file'
  });
}