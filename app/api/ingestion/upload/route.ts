// API endpoint for document upload and ingestion
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import { parseDocument } from '@/lib/ingestion/parser';
import { chunkText } from '@/lib/ingestion/chunker';
import { processChunks } from '@/lib/ingestion/processor';

// Schema for upload request
const UploadRequestSchema = z.object({
  normaId: z.string().min(1),
  documentType: z.enum(['lei', 'resolucao', 'portaria', 'manual']),
  dataPublicacao: z.string().datetime().optional(),
  dataVigenciaInicio: z.string().datetime().optional(),
  dataVigenciaFim: z.string().datetime().optional().nullable(),
});

type UploadRequest = z.infer<typeof UploadRequestSchema>;

/**
 * Validates request body
 */
function validateRequestBody(body: any): UploadRequest {
  try {
    return UploadRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Handles file upload and document processing
 * POST /api/ingestion/upload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let tempFilePath: string | null = null;

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metadataJson = formData.get('metadata') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed: PDF, DOCX, TXT`,
        },
        { status: 400 },
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large: ${file.size} bytes exceeds ${maxSize} bytes`,
        },
        { status: 413 },
      );
    }

    // Parse metadata
    let metadata: UploadRequest;
    try {
      metadata = validateRequestBody(metadataJson ? JSON.parse(metadataJson) : {});
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Invalid metadata',
        },
        { status: 400 },
      );
    }

    // Save file to temporary location
    const buffer = await file.arrayBuffer();
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `ctb-ingestion-${Date.now()}-${file.name}`);

    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    // Parse document
    console.log(`Parsing document: ${file.name}`);
    const parsed = await parseDocument(tempFilePath, file.name);

    // Chunk text
    console.log(`Chunking document into segments`);
    const chunks = chunkText(parsed.text, 500); // ~500 char chunks

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: 'No text content could be extracted from the file',
        },
        { status: 422 },
      );
    }

    console.log(`Created ${chunks.length} chunks`);

    // Process chunks (generate embeddings and insert to DB)
    console.log(`Processing chunks and generating embeddings`);
    const processingResult = await processChunks({
      chunks,
      normaId: metadata.normaId,
      documentType: metadata.documentType,
      dataPublicacao: metadata.dataPublicacao,
      dataVigenciaInicio: metadata.dataVigenciaInicio,
      dataVigenciaFim: metadata.dataVigenciaFim,
    });

    console.log(
      `Processing complete: ${processingResult.insertedCount} inserted, ${processingResult.failedCount} failed`,
    );

    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // Return result
    return NextResponse.json(
      {
        success: processingResult.insertedCount > 0,
        message: `Processed ${file.name}: ${processingResult.insertedCount} chunks inserted`,
        data: {
          fileName: file.name,
          fileSize: file.size,
          pageCount: parsed.pageCount,
          chunkCount: chunks.length,
          insertedCount: processingResult.insertedCount,
          failedCount: processingResult.failedCount,
          insertedIds: processingResult.insertedIds,
          errors: processingResult.errors.length > 0 ? processingResult.errors : undefined,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}

/**
 * Handles GET request with information about the endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'Document Upload Endpoint',
      version: '1.0.0',
      description: 'Upload and process legal documents (PDF, DOCX, TXT)',
      methods: {
        POST: {
          description: 'Upload and ingest a document',
          accepts: 'multipart/form-data',
          fields: {
            file: 'File to upload (PDF, DOCX, or TXT)',
            metadata: 'JSON metadata (normaId, documentType, etc)',
          },
          maxFileSize: '50MB',
        },
      },
    },
    { status: 200 },
  );
}
