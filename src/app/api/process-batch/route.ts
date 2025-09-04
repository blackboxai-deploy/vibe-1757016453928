import { NextRequest, NextResponse } from 'next/server';

interface ProcessBatchRequest {
  sessionId: string;
  batchIndex: number;
  images: string[];
}

interface OpenRouterMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

const MEDICAL_ANALYSIS_PROMPT = `You are an expert radiologist analyzing medical images. Please provide a comprehensive diagnostic analysis for the following medical images. For each image or set of images, please include:

1. **Image Quality Assessment**: Comment on image quality, positioning, and technical factors
2. **Anatomical Structures**: Identify and describe relevant anatomical structures visible
3. **Pathological Findings**: Detail any abnormal findings, lesions, or pathological changes
4. **Differential Diagnosis**: Provide potential diagnoses based on imaging findings
5. **Recommendations**: Suggest additional imaging, follow-up, or clinical correlation if needed
6. **Urgency Level**: Indicate if findings require immediate attention

Please structure your response clearly for each image and provide a summary at the end. Use standard medical terminology and be thorough in your analysis.`;

export async function POST(request: NextRequest) {
  try {
    const body: ProcessBatchRequest = await request.json();
    const { sessionId, batchIndex, images } = body;

    if (!sessionId || batchIndex === undefined || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, batchIndex, or images' },
        { status: 400 }
      );
    }

    if (images.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 images per batch allowed' },
        { status: 400 }
      );
    }

    // Prepare messages for OpenRouter API
    const content: OpenRouterMessage['content'] = [
      {
        type: 'text',
        text: MEDICAL_ANALYSIS_PROMPT
      }
    ];

    // Add images to the content
    images.forEach((imageBase64, index) => {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`
        }
      });
    });

    const messages: OpenRouterMessage[] = [
      {
        role: 'user',
        content: content
      }
    ];

    // Make request to OpenRouter API
    const openRouterResponse = await fetch('https://oi-server.onrender.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'CustomerId': process.env.CUSTOMER_ID || 'default-customer'
      },
      body: JSON.stringify({
        model: 'openrouter/anthropic/claude-3.5-sonnet',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1,
        stream: false
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API Error:', errorText);
      return NextResponse.json(
        { 
          error: 'AI analysis failed',
          details: `API returned ${openRouterResponse.status}: ${errorText}`
        },
        { status: 500 }
      );
    }

    const aiResponse = await openRouterResponse.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    const analysisResult = aiResponse.choices[0].message.content;

    // Store the batch result (in a real app, you'd use a database)
    // For now, we'll return the result directly
    const batchResult = {
      sessionId,
      batchIndex,
      imageCount: images.length,
      analysis: analysisResult,
      processedAt: new Date().toISOString(),
      status: 'completed'
    };

    return NextResponse.json({
      success: true,
      result: batchResult
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during batch processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to process batches.' },
    { status: 405 }
  );
}