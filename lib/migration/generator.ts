import { N8nWorkflow, LamaticWorkflow, LamaticNode, LamaticConnection } from './types';

/**
 * Generator for creating Lamatic workflow JSON
 * Converts mapped nodes and dependencies to final Lamatic format
 */
export class LamaticOutputGenerator {
  /**
   * Generate Lamatic workflow from mapped nodes and dependencies
   */
  generateWorkflow(
    nodesWithDependencies: LamaticNode[],
    originalN8nWorkflow: N8nWorkflow,
    metadata: {
      migrationVersion: string;
      originalWorkflowName: string;
      migrationTimestamp: string;
    },
    connections: Record<string, LamaticConnection>
  ): LamaticWorkflow {
    // Find trigger node
    const triggerNode = this.findTriggerNode(nodesWithDependencies);
    if (!triggerNode) {
      throw new Error('No trigger node found in the workflow');
    }
    
    // CRITICAL: Final validation - ensure all nodeId references point to existing nodes
    // Include trigger node in valid IDs since it exists even though it's separated
    const allValidNodeIds = new Set([
      triggerNode.nodeId,
      ...nodesWithDependencies.map(n => n.nodeId)
    ]);
    
    // Clean any remaining invalid references (safety net)
    // CRITICAL: Preserve code fields - they should NOT be cleaned (would destroy formatting)
    for (const node of nodesWithDependencies) {
      if (node.values) {
        // Save code field before cleaning
        const codeValue = node.values.code;
        node.values = this.cleanInvalidReferences(node.values, allValidNodeIds);
        // Restore code field after cleaning (preserve formatting)
        if (codeValue !== undefined) {
          node.values.code = codeValue;
        }
      }
    }
    
    // Also clean trigger node values
    if (triggerNode.values) {
      const triggerCodeValue = triggerNode.values.code;
      triggerNode.values = this.cleanInvalidReferences(triggerNode.values, allValidNodeIds);
      if (triggerCodeValue !== undefined) {
        triggerNode.values.code = triggerCodeValue;
      }
    }

    // Filter out trigger node from regular nodes
    // Supports both webhookTriggerNode and chatTriggerNode
    const regularNodes = nodesWithDependencies.filter(node => 
      node.nodeType !== 'webhookTriggerNode' && node.nodeType !== 'chatTriggerNode'
    );

    // Calculate execution order
    const executionOrder = this.calculateExecutionOrder(nodesWithDependencies, connections);

    // Update execution order in nodes - calculate dynamically
    const nodesWithOrder = regularNodes.map(node => {
      // Calculate execution order dynamically based on node position
      const orderIndex = executionOrder.indexOf(node.nodeId);
      const nodeExecutionOrder = orderIndex >= 0 ? orderIndex + 1 : 0;
      
      return {
        ...node,
        _flowMetadata: {
          ...node._flowMetadata,
          executionOrder: nodeExecutionOrder
        }
      };
    });

    // Update trigger node execution order
    const triggerOrderIndex = executionOrder.indexOf(triggerNode.nodeId);
    const triggerExecutionOrder = triggerOrderIndex >= 0 ? triggerOrderIndex + 1 : 0;
    
    const triggerWithOrder = {
      ...triggerNode,
      _flowMetadata: {
        ...triggerNode._flowMetadata,
        executionOrder: triggerExecutionOrder
      }
    };

    // CRITICAL: Final code formatting pass - format ALL code fields right before creating workflow
    // This ensures code is formatted even if it was modified by any previous step
    this.formatAllCodeFields(nodesWithOrder);
    this.formatAllCodeFields([triggerWithOrder]);

    // Create the final workflow with exact format from example
    const workflow: LamaticWorkflow = {
      name: `${originalN8nWorkflow.name} - runtime-ready`,
      description: `Migrated from n8n: ${originalN8nWorkflow.name} (runtime-ready with x-runtime hints)`,
      triggerNode: triggerWithOrder,
      nodes: nodesWithOrder,
      connections: this.createConnectionsWithOrder(connections, executionOrder),
      'x-runtime': {
        policies: {
          retry: { attempts: 3 },
          timeoutMs: 120000
        },
        defaults: {
          nodeDefaultTimeoutMs: 60000,
          nodeDefaultRetries: 1
        }
      },
      '_flowMetadata': {
        flowType: 'linear',
        patterns: [],
        executionOrder: executionOrder.map(nodeId => {
          const node = nodesWithDependencies.find(n => n.nodeId === nodeId);
          return node?.nodeName || nodeId;
        }),
        branchCount: 0,
        mergeCount: 0,
        errorHandlers: 0
      }
    };

    return workflow;
  }

  /**
   * Find the trigger node from the list of nodes
   * Supports both webhookTriggerNode and chatTriggerNode
   */
  private findTriggerNode(nodes: LamaticNode[]): LamaticNode | undefined {
    const trigger = nodes.find(node => 
      node.nodeType === 'webhookTriggerNode' || node.nodeType === 'chatTriggerNode'
    );
    if (!trigger) {
      // Debug: Log what node types we have
      const nodeTypes = nodes.map(n => `${n.nodeName} (${n.nodeType})`).join(', ');
      console.warn(`No trigger node found. Available nodes: ${nodeTypes}`);
    }
    return trigger;
  }
  
  /**
   * Final cleanup of invalid nodeId references (safety net)
   * CRITICAL: Never treats $json as a node ID - it's a data reference
   */
  private cleanInvalidReferences(obj: any, validNodeIds: Set<string>): any {
    if (obj == null) return obj;

    if (typeof obj === 'string') {
      let result = obj;
      
      // CRITICAL: First, remove any invalid $('$json') patterns - $json is NOT a node
      result = result.replace(/\$\(['"]\$json['"]\)/g, '$json');
      
      const matches: Array<{match: string; nodeId: string; start: number; end: number}> = [];
      
      // Find all $('nodeId') patterns
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
      
      // Process in reverse order
      for (let i = matches.length - 1; i >= 0; i--) {
        const { nodeId, start, end } = matches[i];
        
        // Double-check: never treat $json as a node
        if (nodeId === '$json' || nodeId.startsWith('$json')) {
          // Replace with plain $json
          result = result.substring(0, start) + '$json' + result.substring(end);
          continue;
        }
        
        if (!validNodeIds.has(nodeId)) {
          // Invalid reference - remove or replace
          const afterText = result.substring(end);
          const expressionMatch = afterText.match(/^(\.[\w.]+)/);
          
          if (expressionMatch) {
            result = result.substring(0, start) + `$json${expressionMatch[1]}` + result.substring(end + expressionMatch[0].length);
          } else {
            result = result.substring(0, start) + result.substring(end);
          }
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
      return obj.map(v => this.cleanInvalidReferences(v, validNodeIds)).filter(v => v !== '');
    }
    
    if (typeof obj === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        // CRITICAL: Skip 'code' field - it should never be cleaned (preserves formatting)
        if (k === 'code') {
          out[k] = v;
          continue;
        }
        const cleaned = this.cleanInvalidReferences(v, validNodeIds);
        if (cleaned !== '' || typeof cleaned === 'number' || typeof cleaned === 'boolean' || cleaned === null || (Array.isArray(cleaned) && cleaned.length > 0)) {
          out[k] = cleaned;
        }
      }
      return out;
    }
    
    return obj;
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(
    nodes: LamaticNode[],
    connections: Record<string, LamaticConnection>
  ): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        return; // Skip circular dependencies
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visiting.add(nodeId);
      
      // Visit dependencies first
      const node = nodes.find(n => n.nodeId === nodeId);
      if (node) {
        for (const dep of node.needs) {
          visit(dep);
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };
    
    // Visit all nodes
    for (const node of nodes) {
      if (!visited.has(node.nodeId)) {
        visit(node.nodeId);
      }
    }
    
    return order;
  }

  /**
   * Create connections with execution order
   */
  private createConnectionsWithOrder(
    connections: Record<string, LamaticConnection>,
    executionOrder: string[]
  ): Record<string, LamaticConnection> {
    const updatedConnections: Record<string, LamaticConnection> = {};
    
    for (const [nodeId, connection] of Object.entries(connections)) {
      // Calculate execution order dynamically based on node position
      const orderIndex = executionOrder.indexOf(nodeId);
      const nodeExecutionOrder = orderIndex >= 0 ? orderIndex + 1 : 0;
      
      updatedConnections[nodeId] = {
        ...connection,
        executionOrder: nodeExecutionOrder
      };
    }
    
    return updatedConnections;
  }

  /**
   * Formats all code fields in nodes - final pass to ensure code is properly formatted
   * This is called right before creating the workflow to catch any code that wasn't formatted
   */
  private formatAllCodeFields(nodes: LamaticNode[]): void {
    for (const node of nodes) {
      if (node.values && typeof node.values.code === 'string' && node.values.code.length > 20) {
        const code = node.values.code;
        // Check if code has newlines
        const newlineCount = (code.match(/\n/g) || []).length;
        
        // If no newlines, format it by splitting on semicolons
        if (newlineCount === 0) {
          // Simple formatter: split on semicolons (outside strings)
          let formatted = '';
          let inString = false;
          let stringChar = '';
          let escapeNext = false;
          
          for (let i = 0; i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            
            if (escapeNext) {
              escapeNext = false;
              formatted += char;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              formatted += char;
              continue;
            }
            
            if ((char === '"' || char === "'" || char === '`') && !escapeNext) {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
                stringChar = '';
              }
              formatted += char;
              continue;
            }
            
            if (char === ';' && !inString) {
              formatted += ';\n';
            } else {
              formatted += char;
            }
          }
          
          // Apply basic indentation
          const lines = formatted.split('\n').map(l => l.trim()).filter(l => l);
          let indent = 0;
          const indented = lines.map(line => {
            if (line.startsWith('}') || line.startsWith(']')) indent = Math.max(0, indent - 1);
            const result = '  '.repeat(indent) + line;
            if (line.endsWith('{') || line.endsWith('[')) indent++;
            return result;
          }).join('\n');
          
          node.values.code = indented;
          console.log(`[Final Format] Formatted code for node: ${node.nodeName}, Newlines: ${(indented.match(/\n/g) || []).length}`);
        }
      }
    }
  }

  /**
   * Format workflow for download
   */
  formatWorkflowForDownload(workflow: LamaticWorkflow): string {
    // CRITICAL: Format code one more time right before stringifying
    this.formatAllCodeFields(workflow.nodes);
    if (workflow.triggerNode.values && workflow.triggerNode.values.code) {
      this.formatAllCodeFields([workflow.triggerNode]);
    }
    
    return JSON.stringify(workflow, null, 2);
  }

  /**
   * Generate migration report
   */
  generateMigrationReport(
    originalWorkflow: N8nWorkflow,
    convertedWorkflow: LamaticWorkflow,
    nodeResults: any[]
  ): any {
    return {
      summary: {
        originalName: originalWorkflow.name,
        convertedName: convertedWorkflow.name,
        originalNodeCount: originalWorkflow.nodes.length,
        convertedNodeCount: convertedWorkflow.nodes.length + 1, // +1 for trigger
        successRate: `${Math.round((nodeResults.filter(r => r.status === 'success').length / nodeResults.length) * 100)}%`
      },
      nodeBreakdown: {
        total: nodeResults.length,
        successful: nodeResults.filter(r => r.status === 'success').length,
        warnings: nodeResults.filter(r => r.status === 'warning').length,
        errors: nodeResults.filter(r => r.status === 'error').length,
        skipped: nodeResults.filter(r => r.status === 'skipped').length
      },
      nodeDetails: nodeResults,
      recommendations: this.generateRecommendations(nodeResults),
      nextSteps: [
        'Review the converted workflow in Lamatic Studio',
        'Configure any missing credentials',
        'Test the workflow with sample data',
        'Deploy to your desired environment'
      ]
    };
  }

  /**
   * Generate recommendations based on migration results
   */
  private generateRecommendations(nodeResults: any[]): string[] {
    const recommendations: string[] = [];
    
    const errorNodes = nodeResults.filter(r => r.status === 'error');
    const warningNodes = nodeResults.filter(r => r.status === 'warning');
    const reauthNodes = nodeResults.filter(r => r.requiresReauth);
    
    if (errorNodes.length > 0) {
      recommendations.push(`${errorNodes.length} nodes failed to convert and need manual setup`);
    }
    
    if (warningNodes.length > 0) {
      recommendations.push(`${warningNodes.length} nodes converted with warnings - review configuration`);
    }
    
    if (reauthNodes.length > 0) {
      recommendations.push(`${reauthNodes.length} nodes require credential reconfiguration`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Migration completed successfully - ready for deployment');
    }
    
    return recommendations;
  }
}