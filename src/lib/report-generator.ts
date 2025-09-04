import { DiagnosticBatch, DiagnosticReport, ProcessingSession } from '@/types/medical';

export interface ReportSection {
  title: string;
  content: string;
  findings: string[];
  recommendations: string[];
}

export interface BatchSummary {
  batchNumber: number;
  imageCount: number;
  keyFindings: string[];
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  processingTime: number;
}

export class ReportGenerator {
  private static formatTimestamp(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  private static extractFindings(aiResponse: string): string[] {
    const findings: string[] = [];
    const lines = aiResponse.split('\n');
    
    let inFindingsSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('findings') || trimmed.toLowerCase().includes('observations')) {
        inFindingsSection = true;
        continue;
      }
      if (inFindingsSection && trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        findings.push(trimmed.replace(/^[-\d.]\s*/, ''));
      }
      if (inFindingsSection && trimmed === '') {
        inFindingsSection = false;
      }
    }
    
    return findings.length > 0 ? findings : [aiResponse.substring(0, 200) + '...'];
  }

  private static extractRecommendations(aiResponse: string): string[] {
    const recommendations: string[] = [];
    const lines = aiResponse.split('\n');
    
    let inRecommendationsSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('recommendation') || trimmed.toLowerCase().includes('suggest')) {
        inRecommendationsSection = true;
        continue;
      }
      if (inRecommendationsSection && (trimmed.startsWith('-') || trimmed.match(/^\d+\./))) {
        recommendations.push(trimmed.replace(/^[-\d.]\s*/, ''));
      }
      if (inRecommendationsSection && trimmed === '') {
        inRecommendationsSection = false;
      }
    }
    
    return recommendations;
  }

  private static determineSeverity(aiResponse: string): 'normal' | 'mild' | 'moderate' | 'severe' | 'critical' {
    const response = aiResponse.toLowerCase();
    
    if (response.includes('critical') || response.includes('emergency') || response.includes('urgent')) {
      return 'critical';
    }
    if (response.includes('severe') || response.includes('significant')) {
      return 'severe';
    }
    if (response.includes('moderate') || response.includes('concerning')) {
      return 'moderate';
    }
    if (response.includes('mild') || response.includes('minor') || response.includes('slight')) {
      return 'mild';
    }
    
    return 'normal';
  }

  static generateBatchSummary(batch: DiagnosticBatch): BatchSummary {
    const findings = this.extractFindings(batch.aiResponse);
    const severity = this.determineSeverity(batch.aiResponse);
    
    return {
      batchNumber: batch.batchNumber,
      imageCount: batch.imageCount,
      keyFindings: findings.slice(0, 3),
      severity,
      processingTime: batch.processingTime
    };
  }

  static generateExecutiveSummary(batches: DiagnosticBatch[]): string {
    const totalImages = batches.reduce((sum, batch) => sum + batch.imageCount, 0);
    const severities = batches.map(batch => this.determineSeverity(batch.aiResponse));
    const highestSeverity = this.getHighestSeverity(severities);
    
    const criticalFindings = batches
      .filter(batch => this.determineSeverity(batch.aiResponse) === 'critical' || this.determineSeverity(batch.aiResponse) === 'severe')
      .flatMap(batch => this.extractFindings(batch.aiResponse).slice(0, 2));

    let summary = `Comprehensive radiological analysis of ${totalImages} medical images across ${batches.length} image batches. `;
    
    if (highestSeverity === 'critical' || highestSeverity === 'severe') {
      summary += `PRIORITY: ${highestSeverity.toUpperCase()} findings detected requiring immediate attention. `;
    }
    
    if (criticalFindings.length > 0) {
      summary += `Key concerns include: ${criticalFindings.slice(0, 3).join(', ')}. `;
    }
    
    summary += `Detailed analysis and recommendations provided in the sections below.`;
    
    return summary;
  }

  private static getHighestSeverity(severities: string[]): string {
    const severityOrder = ['normal', 'mild', 'moderate', 'severe', 'critical'];
    let highest = 'normal';
    
    for (const severity of severities) {
      if (severityOrder.indexOf(severity) > severityOrder.indexOf(highest)) {
        highest = severity;
      }
    }
    
    return highest;
  }

  static generateDetailedFindings(batches: DiagnosticBatch[]): ReportSection[] {
    return batches.map((batch, index) => {
      const findings = this.extractFindings(batch.aiResponse);
      const recommendations = this.extractRecommendations(batch.aiResponse);
      
      return {
        title: `Image Series ${batch.batchNumber} Analysis (${batch.imageCount} images)`,
        content: batch.aiResponse,
        findings,
        recommendations
      };
    });
  }

  static generateConsolidatedRecommendations(batches: DiagnosticBatch[]): string[] {
    const allRecommendations = batches.flatMap(batch => 
      this.extractRecommendations(batch.aiResponse)
    );
    
    // Remove duplicates and prioritize by severity
    const uniqueRecommendations = Array.from(new Set(allRecommendations));
    
    // Add general recommendations based on findings
    const generalRecommendations = [
      'Follow up with referring physician to discuss findings',
      'Consider correlation with clinical symptoms and history',
      'Maintain regular monitoring schedule as clinically indicated'
    ];
    
    return [...uniqueRecommendations, ...generalRecommendations];
  }

  static generateFullReport(session: ProcessingSession): DiagnosticReport {
    const { batches, sessionId, startTime, endTime } = session;
    const batchSummaries = batches.map(batch => this.generateBatchSummary(batch));
    const executiveSummary = this.generateExecutiveSummary(batches);
    const detailedFindings = this.generateDetailedFindings(batches);
    const recommendations = this.generateConsolidatedRecommendations(batches);
    
    const totalProcessingTime = endTime ? endTime.getTime() - startTime.getTime() : 0;
    const totalImages = batches.reduce((sum, batch) => sum + batch.imageCount, 0);
    
    return {
      sessionId,
      generatedAt: new Date(),
      totalImages,
      totalBatches: batches.length,
      processingTime: totalProcessingTime,
      executiveSummary,
      batchSummaries,
      detailedFindings,
      recommendations,
      metadata: {
        aiModel: 'Claude Sonnet 4',
        processingMethod: 'Batch Analysis',
        imageFormats: ['DICOM', 'PNG', 'JPEG'],
        batchSize: 20,
        startTime: this.formatTimestamp(startTime),
        endTime: endTime ? this.formatTimestamp(endTime) : 'In Progress'
      }
    };
  }

  static generateReportHTML(report: DiagnosticReport): string {
    const severityColors = {
      normal: '#10b981',
      mild: '#f59e0b',
      moderate: '#f97316',
      severe: '#ef4444',
      critical: '#dc2626'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnostic Report - ${report.sessionId}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e40af; margin: 0; font-size: 2.5em; }
        .header .meta { color: #6b7280; font-size: 0.9em; margin-top: 10px; }
        .summary { background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6; }
        .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .batch-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; color: white; }
        .findings-list { list-style: none; padding: 0; }
        .findings-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .recommendations { background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .footer { text-align: center; color: #6b7280; font-size: 0.8em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Radiological Diagnostic Report</h1>
            <div class="meta">
                <strong>Session ID:</strong> ${report.sessionId}<br>
                <strong>Generated:</strong> ${this.formatTimestamp(report.generatedAt)}<br>
                <strong>Total Images:</strong> ${report.totalImages} | <strong>Processing Time:</strong> ${Math.round(report.processingTime / 1000)}s
            </div>
        </div>

        <div class="summary section">
            <h2>Executive Summary</h2>
            <p>${report.executiveSummary}</p>
        </div>

        <div class="section">
            <h2>Batch Analysis Overview</h2>
            <div class="batch-grid">
                ${report.batchSummaries.map(batch => `
                    <div class="batch-card">
                        <h3>Batch ${batch.batchNumber}</h3>
                        <p><strong>Images:</strong> ${batch.imageCount}</p>
                        <span class="severity-badge" style="background-color: ${severityColors[batch.severity] || '#6b7280'}">
                            ${batch.severity.toUpperCase()}
                        </span>
                        <ul class="findings-list">
                            ${batch.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>Detailed Findings</h2>
            ${report.detailedFindings.map(section => `
                <div style="margin-bottom: 25px;">
                    <h3>${section.title}</h3>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        ${section.content.replace(/\n/g, '<br>')}
                    </div>
                    ${section.findings.length > 0 ? `
                        <h4>Key Findings:</h4>
                        <ul>
                            ${section.findings.map(finding => `<li>${finding}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="recommendations section">
            <h2>Clinical Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="footer">
            <p>This report was generated using AI-assisted analysis (${report.metadata.aiModel}) and should be reviewed by a qualified radiologist.<br>
            Report generated on ${report.metadata.endTime}</p>
        </div>
    </div>
</body>
</html>`;
  }

  static exportToPDF(report: DiagnosticReport): string {
    // This would integrate with a PDF generation library like puppeteer or jsPDF
    // For now, return the HTML version that can be printed to PDF
    return this.generateReportHTML(report);
  }
}