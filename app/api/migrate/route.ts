import { NextRequest, NextResponse } from 'next/server';
import { processMigration, getMigrationStats, getSupportedNodeTypes } from '../../../actions/orchestrate';

/**
 * POST /api/migrate - Migrates n8n workflow to Lamatic format.
 * 
 * Accepts either:
 * 1. JSON body with 'jsonText', 'json', or 'content' field containing workflow JSON
 * 2. FormData with 'file' field containing a .json file
 * 
 * Validates file size (10MB limit) and JSON format before processing.
 * 
 * @param request - Next.js request object
 * @returns MigrationResult with success status, converted workflow, and statistics
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Determine request format: JSON body (pasted content) or FormData (file upload)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const jsonText = body.jsonText || body.json || body.content;

      if (!jsonText || typeof jsonText !== 'string') {
        return NextResponse.json(
          { error: 'No JSON content provided' },
          { status: 400 }
        );
      }

      // Validate JSON content size: 10MB maximum
      const maxSize = 10 * 1024 * 1024;
      if (jsonText.length > maxSize) {
        return NextResponse.json(
          { error: 'JSON content exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Validate JSON syntax before processing
      try {
        JSON.parse(jsonText);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid JSON format' },
          { status: 400 }
        );
      }

      // Execute migration pipeline on JSON content
      const result = await processMigration(jsonText);

      return NextResponse.json(result);
    } else {
      // Handle FormData file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file extension: only .json files accepted
      if (!file.name.endsWith('.json')) {
        return NextResponse.json(
          { error: 'Only JSON files are supported' },
          { status: 400 }
        );
      }

      // Validate file size: 10MB maximum
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Execute migration pipeline on uploaded file
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
 * GET /api/migrate - Returns migration tool statistics and supported node types.
 * 
 * Provides information about:
 * - Total supported node types
 * - Migration version
 * - List of all supported n8n node types
 * 
 * @returns JSON object with stats, supportedNodeTypes array, and version
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
