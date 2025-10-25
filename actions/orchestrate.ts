"use server";

import { N8nParser } from '../lib/migration/parser';
import { NodeMapper } from '../lib/migration/mapper';
import { DependencyBuilder } from '../lib/migration/dependencies';
import { LamaticOutputGenerator } from '../lib/migration/generator';
import { 
  MigrationResult, 
  MigrationProgress, 
  MigrationStep,
  N8nWorkflow,
  LamaticWorkflow,
  NodeMigrationResult
} from '../lib/migration/types';

/**
 * Main migration pipeline for converting n8n workflows to Lamatic
 * Orchestrates the entire migration process from file upload to final output
 */

// Initialize components
const parser = new N8nParser();
const mapper = new NodeMapper();
const dependencyBuilder = new DependencyBuilder();
const generator = new LamaticOutputGenerator();

/**
 * Main processing method that orchestrates the entire migration
 */
export async function processMigration(file: File | string): Promise<MigrationResult> {
  const startTime = Date.now();
  const migrationLog: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Handle both File objects and string content
    let fileContent: string;
    let fileName: string;
    
    if (typeof file === 'string') {
      fileContent = file;
      fileName = 'workflow.json';
      migrationLog.push(`Starting migration of workflow content`);
      migrationLog.push(`Content size: ${(fileContent.length / 1024).toFixed(2)} KB`);
    } else {
      fileContent = await file.text();
      fileName = file.name;
      migrationLog.push(`Starting migration of file: ${fileName}`);
      migrationLog.push(`File size: ${(file.size / 1024).toFixed(2)} KB`);
    }

    // Step 1: Parse n8n workflow
    migrationLog.push('Step 1: Parsing n8n workflow...');
    const n8nWorkflow = await parser.parseWorkflow(fileContent);
    migrationLog.push(`Parsed workflow: ${n8nWorkflow.name} with ${n8nWorkflow.nodes.length} nodes`);

    // Step 2: Map nodes to Lamatic equivalents
    migrationLog.push('Step 2: Mapping nodes to Lamatic equivalents...');
    const mappingResults = await mapNodes(n8nWorkflow);
    migrationLog.push(`Mapped ${mappingResults.length} nodes`);

    // Step 3: Build dependencies
    migrationLog.push('Step 3: Building dependency structure...');
    
    // Filter out placeholder nodes
    const filteredResults = mappingResults.filter(result => 
      result.lamaticNode.nodeType !== 'placeholderNode'
    );
    
    const dependencyResults = dependencyBuilder.buildDependencies(
      n8nWorkflow,
      filteredResults.map(r => r.lamaticNode)
    );
    
    migrationLog.push(`Built dependencies for ${dependencyResults.nodesWithDependencies.length} nodes`);

    // Step 4: Generate Lamatic workflow
    migrationLog.push('Step 4: Generating Lamatic workflow...');
    let lamaticWorkflow: LamaticWorkflow;
    try {
      lamaticWorkflow = generator.generateWorkflow(
        dependencyResults.nodesWithDependencies,
        n8nWorkflow,
        {
          migrationVersion: '1.0.0',
          originalWorkflowName: n8nWorkflow.name,
          migrationTimestamp: new Date().toISOString(),
        },
        dependencyResults.connections
      );
    } catch (error) {
      console.error('Generator error:', error);
      throw error;
    }

    // Compile results
    const nodeResults = compileNodeResults(mappingResults);
    const processingTime = Date.now() - startTime;

    migrationLog.push(`Migration completed in ${(processingTime / 1000).toFixed(2)} seconds`);

    const result: MigrationResult = {
      success: true,
      totalNodes: n8nWorkflow.nodes.length,
      convertedNodes: nodeResults.filter(r => r.status === 'success' || r.status === 'warning').length,
      warningNodes: nodeResults.filter(r => r.status === 'warning').length,
      errorNodes: nodeResults.filter(r => r.status === 'error').length,
      skippedNodes: nodeResults.filter(r => r.status === 'skipped').length,
      nodeResults,
      lamaticWorkflow,
      migrationLog,
      processingTime,
      errors: [...errors, ...dependencyResults.warnings],
      warnings: [...warnings, ...dependencyResults.warnings],
    };

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    migrationLog.push(`Migration failed: ${errorMessage}`);
    errors.push(errorMessage);

    return {
      success: false,
      totalNodes: 0,
      convertedNodes: 0,
      warningNodes: 0,
      errorNodes: 0,
      skippedNodes: 0,
      nodeResults: [],
      migrationLog,
      processingTime,
      errors,
      warnings,
    };
  }
}

/**
 * Maps n8n nodes to Lamatic nodes
 */
async function mapNodes(n8nWorkflow: N8nWorkflow): Promise<Array<{
  lamaticNode: any;
  requiresManualSetup: boolean;
  requiresReauth: boolean;
  warnings: string[];
  n8nNode: any;
}>> {
  const results = [];

  for (const n8nNode of n8nWorkflow.nodes) {
    try {
      const nodeId = mapper.generateNodeId(n8nNode.id);
      const mappingResult = mapper.mapNode(n8nNode, nodeId);
      
      results.push({
        lamaticNode: mappingResult.lamaticNode,
        requiresManualSetup: mappingResult.requiresManualSetup,
        requiresReauth: mappingResult.requiresReauth,
        warnings: mappingResult.warnings,
        n8nNode,
      });
    } catch (error) {
      // Handle mapping errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown mapping error';
      results.push({
        lamaticNode: createErrorNode(n8nNode, errorMessage),
        requiresManualSetup: true,
        requiresReauth: false,
        warnings: [errorMessage],
        n8nNode,
      });
    }
  }

  return results;
}

/**
 * Compiles node results from mapping
 */
function compileNodeResults(
  mappingResults: Array<{
    lamaticNode: any;
    requiresManualSetup: boolean;
    requiresReauth: boolean;
    warnings: string[];
    n8nNode: any;
  }>
): NodeMigrationResult[] {
  const compiledResults: NodeMigrationResult[] = [];

  for (const mappingResult of mappingResults) {
    const compiledResult: NodeMigrationResult = {
      n8nNodeId: mappingResult.n8nNode.id,
      n8nNodeName: mappingResult.n8nNode.name,
      n8nNodeType: mappingResult.n8nNode.type,
      status: determineNodeStatus(mappingResult),
      lamaticNodeId: mappingResult.lamaticNode.nodeId,
      lamaticNodeName: mappingResult.lamaticNode.nodeName,
      lamaticNodeType: mappingResult.lamaticNode.nodeType,
      message: generateNodeMessage(mappingResult),
      warnings: mappingResult.warnings,
      errors: [],
      requiresManualSetup: mappingResult.requiresManualSetup,
      requiresReauth: mappingResult.requiresReauth,
    };

    compiledResults.push(compiledResult);
  }

  return compiledResults;
}

/**
 * Determines the overall status of a node
 */
function determineNodeStatus(mappingResult: any): 'success' | 'warning' | 'error' | 'skipped' {
  if (mappingResult.lamaticNode.nodeType === 'placeholderNode') {
    return 'error';
  }

  if (mappingResult.warnings.length > 0) {
    return 'warning';
  }

  return 'success';
}

/**
 * Generates a user-friendly message for a node
 */
function generateNodeMessage(mappingResult: any): string {
  if (mappingResult.lamaticNode.nodeType === 'placeholderNode') {
    return 'Node type not supported - requires manual setup';
  }

  if (mappingResult.warnings.length > 0) {
    return `Converted with warnings: ${mappingResult.warnings.join(', ')}`;
  }

  return 'Successfully converted';
}

/**
 * Creates an error node for failed mappings
 */
function createErrorNode(n8nNode: any, errorMessage: string): any {
  return {
    nodeId: mapper.generateNodeId(n8nNode.id),
    nodeName: `${n8nNode.name} (Error)`,
    nodeType: 'ErrorNode',
    values: {
      error: errorMessage,
      originalNode: n8nNode,
    },
    modes: {},
    needs: [],
  };
}

/**
 * Gets migration progress for real-time updates
 */
export async function getMigrationProgress(step: MigrationStep, progress: number, message: string): Promise<MigrationProgress> {
  return {
    currentStep: step,
    progress: Math.min(100, Math.max(0, progress)),
    message,
    startTime: Date.now(),
  };
}

/**
 * Validates n8n workflow before processing
 */
export async function validateInput(file: File | string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  workflow?: N8nWorkflow;
}> {
  try {
    const fileContent = typeof file === 'string' ? file : await file.text();
    const workflow = await parser.parseWorkflow(fileContent);
    const validation = parser.validateForMigration(workflow);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      workflow: validation.isValid ? workflow : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      warnings: [],
    };
  }
}

/**
 * Gets supported node types
 */
export async function getSupportedNodeTypes(): Promise<string[]> {
  return mapper.getSupportedNodeTypes();
}

/**
 * Gets migration statistics
 */
export async function getMigrationStats(): Promise<{
  supportedNodeTypes: number;
  totalMappings: number;
  migrationVersion: string;
}> {
  const mappings = mapper.getAllMappings();
  return {
    supportedNodeTypes: mappings.filter(m => m.isSupported).length,
    totalMappings: mappings.length,
    migrationVersion: '1.0.0',
  };
}