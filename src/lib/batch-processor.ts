import { DiagnosticReport, ProcessingStatus, ImageBatch } from '@/types/medical';

export interface BatchProcessorOptions {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  onProgress?: (progress: ProcessingStatus) => void;
  onBatchComplete?: (batchIndex: number, result: any) => void;
  onError?: (error: Error, batchIndex: number) => void;
}

export class BatchProcessor {
  private options: BatchProcessorOptions;
  private processingStatus: ProcessingStatus;

  constructor(options: Partial<BatchProcessorOptions> = {}) {
    this.options = {
      batchSize: 20,
      maxRetries: 3,
      retryDelay: 2000,
      ...options,
    };

    this.processingStatus = {
      totalImages: 0,
      processedImages: 0,
      currentBatch: 0,
      totalBatches: 0,
      status: 'idle',
      errors: [],
      results: [],
    };
  }

  async processImages(images: string[], sessionId: string): Promise<DiagnosticReport> {
    this.processingStatus = {
      totalImages: images.length,
      processedImages: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(images.length / this.options.batchSize),
      status: 'processing',
      errors: [],
      results: [],
    };

    const batches = this.createBatches(images);
    const batchResults: any[] = [];

    for (let i = 0; i < batches.length; i++) {
      this.processingStatus.currentBatch = i + 1;
      this.options.onProgress?.(this.processingStatus);

      try {
        const result = await this.processBatchWithRetry(batches[i], i, sessionId);
        batchResults.push(result);
        this.processingStatus.results.push(result);
        this.processingStatus.processedImages += batches[i].length;
        this.options.onBatchComplete?.(i, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.processingStatus.errors.push({
          batchIndex: i,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
        this.options.onError?.(error as Error, i);
      }

      this.options.onProgress?.(this.processingStatus);
    }

    this.processingStatus.status = 'completed';
    return this.generateFinalReport(batchResults, sessionId);
  }

  private createBatches(images: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < images.length; i += this.options.batchSize) {
      batches.push(images.slice(i, i + this.options.batchSize));
    }
    return batches;
  }

  private async processBatchWithRetry(
    batch: string[],
    batchIndex: number,
    sessionId: string
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        return await this.processSingleBatch(batch, batchIndex, sessionId);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.options.maxRetries - 1) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error(`Failed to process batch ${batchIndex} after ${this.options.maxRetries} attempts`);
  }

  private async processSingleBatch(
    batch: string[],
    batchIndex: number,
    sessionId: string
  ): Promise<any> {
    const response = await fetch('/api/process-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: batch,
        batchIndex,
        sessionId,
        totalBatches: this.processingStatus.totalBatches,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch processing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async generateFinalReport(
    batchResults: any[],
    sessionId: string
  ): Promise<DiagnosticReport> {
    const validResults = batchResults.filter(result => result && result.analysis);
    
    const report: DiagnosticReport = {
      sessionId,
      timestamp: new Date().toISOString(),
      totalImages: this.processingStatus.totalImages,
      processedImages: this.processingStatus.processedImages,
      totalBatches: this.processingStatus.totalBatches,
      successfulBatches: validResults.length,
      failedBatches: this.processingStatus.errors.length,
      overallFindings: this.aggregateFindings(validResults),
      batchSummaries: validResults.map((result, index) => ({
        batchNumber: index + 1,
        imageCount: result.imageCount || this.options.batchSize,
        findings: result.analysis || 'No analysis available',
        confidence: result.confidence || 'medium',
        keyObservations: result.keyObservations || [],
      })),
      recommendations: this.generateRecommendations(validResults),
      errors: this.processingStatus.errors,
      processingStats: {
        totalProcessingTime: 0,
        averageBatchTime: 0,
        successRate: (validResults.length / this.processingStatus.totalBatches) * 100,
      },
    };

    return report;
  }

  private aggregateFindings(results: any[]): string {
    if (results.length === 0) {
      return 'No successful analyses completed. Please review errors and retry processing.';
    }

    const findings = results
      .map(result => result.analysis)
      .filter(analysis => analysis && analysis.trim().length > 0);

    if (findings.length === 0) {
      return 'Analysis completed but no specific findings were generated.';
    }

    return `Comprehensive analysis of ${this.processingStatus.totalImages} medical images across ${results.length} batches:\n\n${findings.join('\n\n')}`;
  }

  private generateRecommendations(results: any[]): string[] {
    const recommendations: string[] = [];

    if (results.length === 0) {
      recommendations.push('Unable to generate recommendations due to processing failures.');
      recommendations.push('Consider re-uploading images and ensuring proper DICOM format.');
      return recommendations;
    }

    recommendations.push('Review all findings in conjunction with clinical history and symptoms.');
    recommendations.push('Consider correlation with previous imaging studies if available.');
    
    if (this.processingStatus.errors.length > 0) {
      recommendations.push(`Note: ${this.processingStatus.errors.length} batches failed processing and may require manual review.`);
    }

    const successRate = (results.length / this.processingStatus.totalBatches) * 100;
    if (successRate < 100) {
      recommendations.push(`Processing success rate: ${successRate.toFixed(1)}%. Consider reprocessing failed batches.`);
    }

    recommendations.push('Consult with radiologist for final interpretation and clinical correlation.');

    return recommendations;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): ProcessingStatus {
    return { ...this.processingStatus };
  }

  reset(): void {
    this.processingStatus = {
      totalImages: 0,
      processedImages: 0,
      currentBatch: 0,
      totalBatches: 0,
      status: 'idle',
      errors: [],
      results: [],
    };
  }
}

export const createBatchProcessor = (options?: Partial<BatchProcessorOptions>) => {
  return new BatchProcessor(options);
};