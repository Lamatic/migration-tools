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
    
    // IMPORTANT: Build connections with ALL nodes first (including placeholders)
    // This ensures connections are preserved even if target/source is a placeholder
    // We'll filter placeholders after building connections
    const allLamaticNodes = mappingResults.map(r => r.lamaticNode);
    
    const dependencyResults = dependencyBuilder.buildDependencies(
      n8nWorkflow,
      allLamaticNodes
    );
    
    // Now filter out placeholder nodes from the final result
    const filteredNodesWithDependencies = dependencyResults.nodesWithDependencies.filter(
      node => node.nodeType !== 'placeholderNode'
    );
    
    // Filter connections to only include non-placeholder nodes
    const filteredConnections: Record<string, any> = {};
    const placeholderNodeIds = new Set(
      allLamaticNodes
        .filter(n => n.nodeType === 'placeholderNode')
        .map(n => n.nodeId)
    );
    
    for (const [nodeId, connection] of Object.entries(dependencyResults.connections)) {
      if (placeholderNodeIds.has(nodeId)) continue; // Skip placeholder nodes
      
      // Filter out connections to placeholder nodes
      const filteredConnection = { ...connection };
      if (filteredConnection.connections) {
        const cleanedConnections: Record<string, any[][]> = {};
        for (const [portType, portConnections] of Object.entries(filteredConnection.connections)) {
          if (Array.isArray(portConnections)) {
            const cleanedPort: any[][] = [];
            for (const portConnection of portConnections) {
              if (Array.isArray(portConnection)) {
                const cleanedPortConnection = portConnection.filter((conn: any) => 
                  !placeholderNodeIds.has(conn.nodeId)
                );
                if (cleanedPortConnection.length > 0) {
                  cleanedPort.push(cleanedPortConnection);
                }
              }
            }
            if (cleanedPort.length > 0) {
              cleanedConnections[portType] = cleanedPort;
            }
          }
        }
        filteredConnection.connections = cleanedConnections;
      }
      
      filteredConnections[nodeId] = filteredConnection;
    }
    
    // Update dependencyResults with filtered data
    dependencyResults.nodesWithDependencies = filteredNodesWithDependencies;
    dependencyResults.connections = filteredConnections;
    
    // CRITICAL: Clean invalid nodeId references from values after filtering placeholders
    // IMPORTANT: Include trigger node in valid IDs (it's separated later in generator)
    const validNodeIds = new Set(filteredNodesWithDependencies.map(n => n.nodeId));
    // Also ensure we don't validate against nodeIds that don't exist - verify each reference actually exists
    cleanInvalidNodeReferences(filteredNodesWithDependencies, validNodeIds);
    
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
      // Log the nodes that were passed to help debug
      console.error('Nodes passed to generator:', dependencyResults.nodesWithDependencies.map(n => ({
        nodeId: n.nodeId,
        nodeName: n.nodeName,
        nodeType: n.nodeType,
        needs: n.needs
      })));
      // If error is about missing trigger, check if we have any trigger nodes
      if (error instanceof Error && error.message.includes('No trigger node')) {
        const triggerNodes = dependencyResults.nodesWithDependencies.filter(n => n.nodeType === 'webhookTriggerNode');
        console.error(`Trigger nodes found: ${triggerNodes.length}`, triggerNodes.map(t => ({ id: t.nodeId, name: t.nodeName, type: t.nodeType })));
      }
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
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Migration error:', errorMessage);
    console.error('Error stack:', errorStack);
    migrationLog.push(`Migration failed: ${errorMessage}`);
    if (errorStack) {
      migrationLog.push(`Stack trace: ${errorStack.substring(0, 500)}`);
    }
    errors.push(errorMessage);

    // Try to preserve node count even on error
    let totalNodes = 0;
    try {
      if (typeof file === 'string') {
        const parsed = JSON.parse(file);
        totalNodes = parsed.nodes?.length || 0;
      }
    } catch (e) {
      // Ignore parse errors
    }

    return {
      success: false,
      totalNodes,
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
      const nodeId = mapper.generateNodeId(n8nNode.id, n8nNode.type);
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
 * Cleans invalid nodeId references from node values
 * Removes any $('nodeId') references that point to non-existent nodes
 */
function cleanInvalidNodeReferences(
  nodes: any[],
  validNodeIds: Set<string>
): void {
  for (const node of nodes) {
    if (node.values) {
      node.values = removeInvalidReferences(node.values, validNodeIds);
    }
  }
}

/**
 * Recursively removes invalid $('nodeId') references from values
 * Validates all nodeId references point to existing nodes
 * This is a final cleanup pass after placeholder nodes are filtered
 * CRITICAL: Never treats $json as a node ID - it's a data reference
 */
function removeInvalidReferences(obj: any, validNodeIds: Set<string>): any {
  if (obj == null) return obj;

  if (typeof obj === 'string') {
    let result = obj;
    
    // CRITICAL: First, remove any invalid $('$json') patterns - $json is NOT a node
    result = result.replace(/\$\(['"]\$json['"]\)/g, '$json');
    
    const matches: Array<{match: string; nodeId: string; start: number; end: number}> = [];
    
    // Find all $('nodeId') patterns with their positions
    const regex = /\$\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = regex.exec(result)) !== null) {
      const nodeId = match[1].trim();
      // CRITICAL: Skip $json - it's not a node reference
      if (nodeId === '$json' || nodeId.startsWith('$json')) {
        continue; // Skip this match
      }
      matches.push({
        match: match[0],
        nodeId: nodeId,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Process matches in reverse order to preserve indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: fullMatch, nodeId, start, end } = matches[i];
      
      // Double-check: never treat $json as a node
      if (nodeId === '$json' || nodeId.startsWith('$json')) {
        // Replace with plain $json
        result = result.substring(0, start) + '$json' + result.substring(end);
        continue;
      }
      
      if (validNodeIds.has(nodeId)) {
        // Valid reference - keep it
        continue;
      }
      
      // Invalid reference - check if there's an expression after it
      const afterText = result.substring(end);
      const expressionMatch = afterText.match(/^(\.[\w.]+)/);
      
      if (expressionMatch) {
        // Has expression like .item.json.field - replace with $json fallback
        result = result.substring(0, start) + `$json${expressionMatch[1]}` + result.substring(end + expressionMatch[0].length);
      } else {
        // No expression - remove the invalid reference entirely
        result = result.substring(0, start) + result.substring(end);
      }
    }
    
    // Clean up extra whitespace but preserve structure
    return result.replace(/\s{2,}/g, ' ').trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(v => removeInvalidReferences(v, validNodeIds)).filter(v => v !== '');
  }
  
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedValue = removeInvalidReferences(v, validNodeIds);
      // Only include non-empty cleaned values (unless it's a number/boolean/null/array with items)
      if (cleanedValue !== '' || typeof cleanedValue === 'number' || typeof cleanedValue === 'boolean' || cleanedValue === null || (Array.isArray(cleanedValue) && cleanedValue.length > 0)) {
        cleaned[k] = cleanedValue;
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Creates an error node for failed mappings
 * Uses placeholderNode type since ErrorNode is not a valid Lamatic node type
 */
function createErrorNode(n8nNode: any, errorMessage: string): any {
  return {
    nodeId: mapper.generateNodeId(n8nNode.id, n8nNode.type),
    nodeName: `${n8nNode.name} (Error)`,
    nodeType: 'placeholderNode', // Use placeholderNode instead of ErrorNode (not a valid Lamatic type)
    values: {
      originalType: n8nNode.type,
      originalParameters: n8nNode.parameters,
      error: errorMessage,
      note: 'This node failed to map and requires manual setup',
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