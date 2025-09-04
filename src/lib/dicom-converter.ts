import * as dicomParser from 'dicom-parser';
import sharp from 'sharp';

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  instanceNumber?: string;
  rows?: number;
  columns?: number;
  pixelSpacing?: number[];
  windowCenter?: number;
  windowWidth?: number;
}

export interface ConversionResult {
  success: boolean;
  pngBuffer?: Buffer;
  metadata?: DicomMetadata;
  error?: string;
  originalFileName: string;
}

export class DicomConverter {
  /**
   * Convert DICOM file buffer to PNG format
   */
  static async convertDicomToPng(
    dicomBuffer: Buffer,
    originalFileName: string
  ): Promise<ConversionResult> {
    try {
      // Parse DICOM file
      const dataSet = dicomParser.parseDicom(dicomBuffer);
      
      // Extract metadata
      const metadata = this.extractMetadata(dataSet);
      
      // Get pixel data
      const pixelData = this.extractPixelData(dataSet);
      if (!pixelData) {
        return {
          success: false,
          error: 'No pixel data found in DICOM file',
          originalFileName
        };
      }

      // Convert to PNG
      const pngBuffer = await this.pixelDataToPng(pixelData, metadata);
      
      return {
        success: true,
        pngBuffer,
        metadata,
        originalFileName
      };
    } catch (error) {
      return {
        success: false,
        error: `DICOM conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalFileName
      };
    }
  }

  /**
   * Extract metadata from DICOM dataset
   */
  private static extractMetadata(dataSet: any): DicomMetadata {
    const getString = (tag: string) => {
      try {
        return dataSet.string(tag);
      } catch {
        return undefined;
      }
    };

    const getUint16 = (tag: string) => {
      try {
        return dataSet.uint16(tag);
      } catch {
        return undefined;
      }
    };

    const getFloat = (tag: string) => {
      try {
        return dataSet.floatString(tag);
      } catch {
        return undefined;
      }
    };

    return {
      patientName: getString('x00100010'),
      patientId: getString('x00100020'),
      studyDate: getString('x00080020'),
      modality: getString('x00080060'),
      studyDescription: getString('x00081030'),
      seriesDescription: getString('x0008103e'),
      instanceNumber: getString('x00200013'),
      rows: getUint16('x00280010'),
      columns: getUint16('x00280011'),
      pixelSpacing: this.parsePixelSpacing(getString('x00280030')),
      windowCenter: getFloat('x00281050'),
      windowWidth: getFloat('x00281051')
    };
  }

  /**
   * Parse pixel spacing string to array
   */
  private static parsePixelSpacing(pixelSpacingString?: string): number[] | undefined {
    if (!pixelSpacingString) return undefined;
    try {
      return pixelSpacingString.split('\\').map(Number);
    } catch {
      return undefined;
    }
  }

  /**
   * Extract pixel data from DICOM dataset
   */
  private static extractPixelData(dataSet: any): Uint16Array | Uint8Array | null {
    try {
      // Try to get pixel data element
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        return null;
      }

      const bitsAllocated = dataSet.uint16('x00280100') || 16;
      const pixelRepresentation = dataSet.uint16('x00280103') || 0;
      
      if (bitsAllocated === 16) {
        return new Uint16Array(
          dataSet.byteArray.buffer,
          pixelDataElement.dataOffset,
          pixelDataElement.length / 2
        );
      } else {
        return new Uint8Array(
          dataSet.byteArray.buffer,
          pixelDataElement.dataOffset,
          pixelDataElement.length
        );
      }
    } catch (error) {
      console.error('Error extracting pixel data:', error);
      return null;
    }
  }

  /**
   * Convert pixel data to PNG using Sharp
   */
  private static async pixelDataToPng(
    pixelData: Uint16Array | Uint8Array,
    metadata: DicomMetadata
  ): Promise<Buffer> {
    const width = metadata.columns || 512;
    const height = metadata.rows || 512;
    
    let normalizedData: Uint8Array;

    if (pixelData instanceof Uint16Array) {
      // Convert 16-bit to 8-bit
      normalizedData = this.normalize16BitTo8Bit(pixelData, metadata);
    } else {
      normalizedData = pixelData;
    }

    // Create PNG using Sharp
    return await sharp(normalizedData, {
      raw: {
        width,
        height,
        channels: 1
      }
    })
    .png()
    .toBuffer();
  }

  /**
   * Normalize 16-bit pixel data to 8-bit using window/level if available
   */
  private static normalize16BitTo8Bit(
    pixelData: Uint16Array,
    metadata: DicomMetadata
  ): Uint8Array {
    const normalized = new Uint8Array(pixelData.length);
    
    if (metadata.windowCenter && metadata.windowWidth) {
      // Use DICOM window/level for normalization
      const windowCenter = metadata.windowCenter;
      const windowWidth = metadata.windowWidth;
      const windowMin = windowCenter - windowWidth / 2;
      const windowMax = windowCenter + windowWidth / 2;

      for (let i = 0; i < pixelData.length; i++) {
        const value = pixelData[i];
        if (value <= windowMin) {
          normalized[i] = 0;
        } else if (value >= windowMax) {
          normalized[i] = 255;
        } else {
          normalized[i] = Math.round(((value - windowMin) / windowWidth) * 255);
        }
      }
    } else {
      // Auto-normalize based on min/max values
      let min = pixelData[0];
      let max = pixelData[0];
      
      for (let i = 1; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }

      const range = max - min;
      if (range === 0) {
        normalized.fill(128); // Gray if no variation
      } else {
        for (let i = 0; i < pixelData.length; i++) {
          normalized[i] = Math.round(((pixelData[i] - min) / range) * 255);
        }
      }
    }

    return normalized;
  }

  /**
   * Check if a file buffer is a DICOM file
   */
  static isDicomFile(buffer: Buffer): boolean {
    try {
      // Check for DICOM magic number at offset 128
      if (buffer.length < 132) return false;
      
      const magic = buffer.toString('ascii', 128, 132);
      return magic === 'DICM';
    } catch {
      return false;
    }
  }

  /**
   * Batch convert multiple files
   */
  static async convertMultipleFiles(
    files: { buffer: Buffer; fileName: string }[]
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    
    for (const file of files) {
      if (this.isDicomFile(file.buffer)) {
        const result = await this.convertDicomToPng(file.buffer, file.fileName);
        results.push(result);
      } else {
        // Not a DICOM file, assume it's already in a supported format
        results.push({
          success: true,
          pngBuffer: file.buffer,
          originalFileName: file.fileName,
          metadata: {}
        });
      }
    }
    
    return results;
  }
}