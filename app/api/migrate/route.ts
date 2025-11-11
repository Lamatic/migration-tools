import { NextRequest, NextResponse } from 'next/server';
import { processMigration, getMigrationStats, getSupportedNodeTypes } from '../../../actions/orchestrate';

/**
 * API endpoint for n8n workflow migration
 * Handles file upload and processing
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Check if request is JSON (pasted content) or FormData (file upload)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const jsonText = body.jsonText || body.json || body.content;

      if (!jsonText || typeof jsonText !== 'string') {
        return NextResponse.json(
          { error: 'No JSON content provided' },
          { status: 400 }
        );
      }

      // Validate JSON size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (jsonText.length > maxSize) {
        return NextResponse.json(
          { error: 'JSON content exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Validate JSON format
      try {
        JSON.parse(jsonText);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }

      // Process the JSON text
      const result = await processMigration(jsonText);

      return NextResponse.json(result);
    } else {
      // Handle file upload (existing logic)
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.name.endsWith('.json')) {
        return NextResponse.json(
          { error: 'Only JSON files are supported' },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Process the file
      const result = await processMigration(file);

      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('Migration API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for migration statistics
 */
export async function GET() {
  try {
    const stats = await getMigrationStats();
    const supportedTypes = await getSupportedNodeTypes();

    return NextResponse.json({
      stats,
      supportedNodeTypes: supportedTypes,
      version: '1.0.0'
    });

  } catch (error) {
    console.error('Stats API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get migration statistics' },
      { status: 500 }
    );
  }
}
