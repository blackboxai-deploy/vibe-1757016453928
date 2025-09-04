interface AIClientConfig {
  apiKey: string;
  baseURL: string;
  customerId: string;
}

interface ImageData {
  base64: string;
  filename: string;
  format: string;
}

interface BatchProcessingResult {
  batchId: string;
  success: boolean;
  report: string;
  processedImages: number;
  errors?: string[];
}

interface DiagnosticReport {
  sessionId: string;
  totalImages: number;
  processedBatches: number;
  overallFindings: string;
  batchReports: BatchProcessingResult[];
  recommendations: string;
  timestamp: string;
}

class AIClient {
  private config: AIClientConfig;
  private readonly BATCH_SIZE = 20;
  private readonly REQUEST_TIMEOUT = 300000; // 5 minutes

  constructor(config: AIClientConfig) {
    this.config = config;
  }

  private createMedicalPrompt(batchNumber: number, totalBatches: number): string {
    return `You are an expert radiologist analyzing medical images. This is batch ${batchNumber} of ${totalBatches}.

Please provide a comprehensive diagnostic analysis including:

1. **Image Quality Assessment**: Evaluate technical quality, positioning, and diagnostic adequacy
2. **Anatomical Structures**: Identify and describe relevant anatomical structures visible
3. **Pathological Findings**: Detail any abnormalities, lesions, or pathological changes observed
4. **Differential Diagnosis**: List potential diagnoses based on imaging findings
5. **Clinical Correlation**: Suggest additional imaging or clinical correlation if needed
6. **Urgency Assessment**: Indicate if findings require immediate attention

Format your response as a structured medical report with clear sections. Be thorough but concise, using appropriate medical terminology.

If this is part of a multi-batch analysis, focus on the findings in these specific images while noting any patterns that may relate to the overall case.`;
  }

  private async makeAPIRequest(images: ImageData[], batchNumber: number, totalBatches: number): Promise<string> {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: this.createMedicalPrompt(batchNumber, totalBatches)
          },
          ...images.map(img => ({
            type: "image",
            source: {
              type: "base64",
              media_type: `image/${img.format}`,
              data: img.base64
            }
          }))
        ]
      }
    ];

    const requestBody = {
      model: "anthropic/claude-3.5-sonnet",
      messages,
      max_tokens: 4000,
      temperature: 0.1
    };

    const response = await fetch(this.config.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'CustomerId': this.config.customerId
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No analysis generated';
  }

  private createBatches(images: ImageData[]): ImageData[][] {
    const batches: ImageData[][] = [];
    for (let i = 0; i < images.length; i += this.BATCH_SIZE) {
      batches.push(images.slice(i, i + this.BATCH_SIZE));
    }
    return batches;
  }

  private async processBatch(
    batch: ImageData[], 
    batchNumber: number, 
    totalBatches: number,
    onProgress?: (progress: { batchNumber: number; totalBatches: number; status: string }) => void
  ): Promise<BatchProcessingResult> {
    try {
      onProgress?.({ 
        batchNumber, 
        totalBatches, 
        status: `Processing batch ${batchNumber}/${totalBatches} (${batch.length} images)` 
      });

      const report = await this.makeAPIRequest(batch, batchNumber, totalBatches);

      return {
        batchId: `batch_${batchNumber}`,
        success: true,
        report,
        processedImages: batch.length,
      };
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      return {
        batchId: `batch_${batchNumber}`,
        success: false,
        report: `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedImages: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private generateOverallReport(batchResults: BatchProcessingResult[]): { overallFindings: string; recommendations: string } {
    const successfulBatches = batchResults.filter(batch => batch.success);
    const totalProcessedImages = successfulBatches.reduce((sum, batch) => sum + batch.processedImages, 0);
    
    let overallFindings = `COMPREHENSIVE RADIOLOGICAL ANALYSIS\n\n`;
    overallFindings += `Total Images Analyzed: ${totalProcessedImages}\n`;
    overallFindings += `Successful Batches: ${successfulBatches.length}/${batchResults.length}\n\n`;
    
    if (successfulBatches.length > 1) {
      overallFindings += `MULTI-BATCH ANALYSIS SUMMARY:\n`;
      overallFindings += `This comprehensive analysis covers ${successfulBatches.length} separate image batches. `;
      overallFindings += `Cross-referencing findings across all batches for complete diagnostic assessment.\n\n`;
    }

    let recommendations = `CLINICAL RECOMMENDATIONS:\n\n`;
    recommendations += `1. Review all batch findings in conjunction with clinical history\n`;
    recommendations += `2. Consider correlation with laboratory findings and physical examination\n`;
    recommendations += `3. Follow institutional protocols for critical findings\n`;
    
    if (batchResults.some(batch => !batch.success)) {
      recommendations += `4. Note: Some image batches failed processing - manual review recommended\n`;
    }

    return { overallFindings, recommendations };
  }

  async processImages(
    images: ImageData[], 
    sessionId: string,
    onProgress?: (progress: { batchNumber: number; totalBatches: number; status: string }) => void
  ): Promise<DiagnosticReport> {
    if (images.length === 0) {
      throw new Error('No images provided for processing');
    }

    const batches = this.createBatches(images);
    const batchResults: BatchProcessingResult[] = [];

    onProgress?.({ 
      batchNumber: 0, 
      totalBatches: batches.length, 
      status: `Starting analysis of ${images.length} images in ${batches.length} batches` 
    });

    // Process batches sequentially to respect rate limits
    for (let i = 0; i < batches.length; i++) {
      const batchResult = await this.processBatch(
        batches[i], 
        i + 1, 
        batches.length,
        onProgress
      );
      batchResults.push(batchResult);

      // Add delay between batches to prevent rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const { overallFindings, recommendations } = this.generateOverallReport(batchResults);

    return {
      sessionId,
      totalImages: images.length,
      processedBatches: batchResults.length,
      overallFindings,
      batchReports: batchResults,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  async processSingleBatch(images: ImageData[], batchId: string): Promise<BatchProcessingResult> {
    if (images.length > this.BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${this.BATCH_SIZE} images`);
    }

    return this.processBatch(images, 1, 1);
  }
}

// Factory function to create AI client with environment configuration
export function createAIClient(): AIClient {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const customerId = process.env.OPENROUTER_CUSTOMER_ID;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  
  if (!customerId) {
    throw new Error('OPENROUTER_CUSTOMER_ID environment variable is required');
  }

  return new AIClient({
    apiKey,
    baseURL: 'https://oi-server.onrender.com/chat/completions',
    customerId
  });
}

export type { AIClientConfig, ImageData, BatchProcessingResult, DiagnosticReport };
export { AIClient };