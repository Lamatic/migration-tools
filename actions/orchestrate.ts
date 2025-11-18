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
 * Main migration pipeline for converting n8n workflows to Lamatic format.
 * 
 * Orchestrates the complete migration process through four stages:
 * 1. Parse: Extract and validate n8n workflow structure
 * 2. Map: Convert n8n nodes to Lamatic node types
 * 3. Dependencies: Build execution order and connections
 * 4. Generate: Create final Lamatic workflow JSON
 */

// Initialize migration components (singleton instances)
const parser = new N8nParser();
const mapper = new NodeMapper();
const dependencyBuilder = new DependencyBuilder();
const generator = new LamaticOutputGenerator();

/**
 * Main migration orchestration function.
 * 
 * Processes n8n workflow files or JSON strings through the complete migration pipeline.
 * Handles error recovery, placeholder node filtering, and generates comprehensive migration reports.
 * 
 * @param file - File object or JSON string containing n8n workflow
 * @returns MigrationResult with success status, converted workflow, statistics, and logs
 * @throws Error if migration fails at any stage
 */
export async function processMigration(file: File | string): Promise<MigrationResult> {
  const startTime = Date.now();
  const migrationLog: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Extract content from File object or use string directly
    let fileContent: string;
    let fileName: string;
    
    if (typeof file === 'string') {
      // Direct JSON string input (pasted content)
      fileContent = file;
      fileName = 'workflow.json';
      migrationLog.push(`Starting migration of workflow content`);
      migrationLog.push(`Content size: ${(fileContent.length / 1024).toFixed(2)} KB`);
    } else {
      // File upload - read text content
      fileContent = await file.text();
      fileName = file.name;
      migrationLog.push(`Starting migration of file: ${fileName}`);
      migrationLog.push(`File size: ${(file.size / 1024).toFixed(2)} KB`);
    }

    // Stage 1: Parse n8n workflow JSON into normalized structure
    migrationLog.push('Step 1: Parsing n8n workflow...');
    const n8nWorkflow = await parser.parseWorkflow(fileContent);
    migrationLog.push(`Parsed workflow: ${n8nWorkflow.name} with ${n8nWorkflow.nodes.length} nodes`);

    // Stage 2: Map each n8n node to its Lamatic equivalent
    migrationLog.push('Step 2: Mapping nodes to Lamatic equivalents...');
    const mappingResults = await mapNodes(n8nWorkflow);
    migrationLog.push(`Mapped ${mappingResults.length} nodes`);

    // Stage 3: Build dependency structure and connections
    migrationLog.push('Step 3: Building dependency structure...');
    
    // CRITICAL: Build connections with ALL nodes (including placeholders) first.
    // This preserves connection structure even when source/target nodes are unmapped.
    // Placeholders are filtered out after connections are established.
    const allLamaticNodes = mappingResults.map(r => r.lamaticNode);
    
    const dependencyResults = dependencyBuilder.buildDependencies(
      n8nWorkflow,
      allLamaticNodes
    );
    
    // Filter out placeholder nodes (unmapped node types) from final workflow
    // Placeholders are created for unsupported nodes but should not appear in output
    const filteredNodesWithDependencies = dependencyResults.nodesWithDependencies.filter(
      node => node.nodeType !== 'placeholderNode'
    );
    
    // Build set of placeholder node IDs for connection filtering
    const placeholderNodeIds = new Set(
      allLamaticNodes
        .filter(n => n.nodeType === 'placeholderNode')
        .map(n => n.nodeId)
    );
    
    // Remove placeholder nodes from connections and clean connection references
    const filteredConnections: Record<string, any> = {};
    for (const [nodeId, connection] of Object.entries(dependencyResults.connections)) {
      if (placeholderNodeIds.has(nodeId)) continue; // Skip connections from placeholder nodes
      
      // Deep filter: remove connections TO placeholder nodes
      const filteredConnection = { ...connection };
      if (filteredConnection.connections) {
        const cleanedConnections: Record<string, any[][]> = {};
        for (const [portType, portConnections] of Object.entries(filteredConnection.connections)) {
          if (Array.isArray(portConnections)) {
            const cleanedPort: any[][] = [];
            for (const portConnection of portConnections) {
              if (Array.isArray(portConnection)) {
                // Filter out connections targeting placeholder nodes
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
    
    // Update dependency results with filtered nodes and connections
    dependencyResults.nodesWithDependencies = filteredNodesWithDependencies;
    dependencyResults.connections = filteredConnections;
    
    // Clean invalid nodeId references from node values after placeholder removal
    // This removes $('nodeId') references pointing to non-existent nodes
    // CRITICAL: Preserve code fields - they contain formatted code that should not be modified
    const validNodeIds = new Set(filteredNodesWithDependencies.map(n => n.nodeId));
    for (const node of filteredNodesWithDependencies) {
      if (node.values && node.values.code !== undefined) {
        // Save code field before cleaning, restore after
        const codeValue = node.values.code;
        cleanInvalidNodeReferences(node, validNodeIds);
        if (node.values) {
          node.values.code = codeValue;
        }
      } else {
        cleanInvalidNodeReferences(node, validNodeIds);
      }
    }
    
    migrationLog.push(`Built dependencies for ${dependencyResults.nodesWithDependencies.length} nodes`);

    // Stage 4: Generate final Lamatic workflow JSON structure
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
        const triggerNodes = dependencyResults.nodesWithDependencies.filter(n => 
          n.nodeType === 'webhookTriggerNode' || n.nodeType === 'chatTriggerNode'
        );
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
 * Maps all n8n nodes in a workflow to their Lamatic equivalents.
 * 
 * Processes each node through the NodeMapper, handling errors gracefully
 * by creating error placeholder nodes for failed mappings.
 * 
 * @param n8nWorkflow - Parsed n8n workflow containing nodes to map
 * @returns Array of mapping results with Lamatic nodes and metadata
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
      // Create error placeholder node for failed mappings
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
 * Compiles mapping results into standardized NodeMigrationResult format.
 * 
 * Transforms internal mapping results into user-facing migration report format
 * with status, messages, and metadata for each node.
 * 
 * @param mappingResults - Raw mapping results from mapNodes function
 * @returns Array of NodeMigrationResult objects for migration report
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
 * Determines the migration status for a node based on mapping result.
 * 
 * Status hierarchy: error (placeholder) > warning > success
 * 
 * @param mappingResult - Node mapping result with lamaticNode and warnings
 * @returns Status string: 'success', 'warning', 'error', or 'skipped'
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
 * Generates a human-readable status message for a node migration result.
 * 
 * @param mappingResult - Node mapping result with status and warnings
 * @returns User-friendly status message describing the migration outcome
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
 * Removes invalid nodeId references from node values.
 * 
 * Scans node values for $('nodeId') patterns and removes references to nodes
 * that no longer exist (e.g., after placeholder filtering).
 * Preserves code fields which should not be modified.
 * 
 * @param node - Lamatic node to clean
 * @param validNodeIds - Set of valid node IDs that references can point to
 */
function cleanInvalidNodeReferences(
  node: any,
  validNodeIds: Set<string>
): void {
  if (node.values) {
    // CRITICAL: Preserve code field - save it before cleaning
    const codeValue = node.values.code;
    node.values = removeInvalidReferences(node.values, validNodeIds);
    // Restore code field after cleaning (preserve formatting)
    if (codeValue !== undefined) {
      node.values.code = codeValue;
    }
  }
}

/**
 * Recursively removes invalid $('nodeId') references from object values.
 * 
 * Traverses objects and arrays, finding $('nodeId') patterns and validating
 * that referenced nodeIds exist in the validNodeIds set. Replaces invalid
 * references with $json fallback or removes them entirely.
 * 
 * CRITICAL: Never treats $json as a node ID - it's a data reference pattern.
 * 
 * @param obj - Object, array, or primitive value to clean
 * @param validNodeIds - Set of valid node IDs for reference validation
 * @returns Cleaned object with invalid references removed
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
    
    // CRITICAL: Only collapse spaces, NOT newlines or tabs
    // Replace multiple spaces with single space, but preserve newlines and tabs
    result = result.replace(/[ ]{2,}/g, ' ');
    // Only trim spaces, not newlines
    result = result.replace(/^[ ]+|[ ]+$/g, '');
    
    return result;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(v => removeInvalidReferences(v, validNodeIds)).filter(v => v !== '');
  }
  
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    // Fields that must be preserved even if empty (required fields)
    const requiredFields = ['flowId', 'requestInput', 'subflowId'];
    
    for (const [k, v] of Object.entries(obj)) {
      // CRITICAL: Skip 'code' field - it should never be cleaned (preserves formatting)
      if (k === 'code') {
        cleaned[k] = v;
        continue;
      }
      const cleanedValue = removeInvalidReferences(v, validNodeIds);
      // Preserve required fields even if empty, or include non-empty values
      const isRequiredField = requiredFields.includes(k);
      if (isRequiredField || cleanedValue !== '' || typeof cleanedValue === 'number' || typeof cleanedValue === 'boolean' || cleanedValue === null || (Array.isArray(cleanedValue) && cleanedValue.length > 0)) {
        cleaned[k] = cleanedValue;
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Creates a placeholder node for failed node mappings.
 * 
 * Used when a node cannot be mapped due to errors. The placeholder preserves
 * the original node information for manual review.
 * 
 * @param n8nNode - Original n8n node that failed to map
 * @param errorMessage - Error message describing why mapping failed
 * @returns Placeholder Lamatic node with error information
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