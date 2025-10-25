import { N8nWorkflow, N8nNode, N8nConnection } from './types';

/**
 * Parser for n8n workflow JSON files
 * Extracts and validates n8n workflow structure
 */
export class N8nParser {
  /**
   * Parse n8n workflow from JSON content
   */
  parseWorkflow(jsonContent: string): N8nWorkflow {
    try {
      const workflow = JSON.parse(jsonContent);
      
      // Validate basic structure
      if (!workflow.name || !workflow.nodes || !Array.isArray(workflow.nodes)) {
        throw new Error('Invalid n8n workflow structure: missing name or nodes');
      }

      // Normalize connections
      const normalizedConnections = this.normalizeConnections(workflow.connections || {});
      
      // Normalize nodes
      const normalizedNodes = this.normalizeNodes(workflow.nodes);

      return {
        name: workflow.name,
        nodes: normalizedNodes,
        connections: normalizedConnections,
        active: workflow.active || false,
        settings: workflow.settings || {},
        versionId: workflow.versionId,
        meta: workflow.meta || {},
        id: workflow.id,
        tags: workflow.tags || []
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Validate workflow for migration compatibility
   */
  validateForMigration(workflow: N8nWorkflow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required fields
    if (!workflow.name) {
      errors.push('Workflow name is required');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
    }

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => 
      node.type.includes('webhook') || 
      node.type.includes('trigger') ||
      node.type.includes('schedule')
    );

    if (triggerNodes.length === 0) {
      warnings.push('No trigger nodes found - workflow may not be executable');
    }

    // Check for unsupported node types
    const unsupportedNodes = workflow.nodes.filter(node => 
      node.type.includes('stickyNote') || 
      node.type.includes('note')
    );

    if (unsupportedNodes.length > 0) {
      warnings.push(`${unsupportedNodes.length} documentation nodes will be skipped`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Normalize n8n connections structure
   */
  private normalizeConnections(connections: Record<string, any>): Record<string, N8nConnection[]> {
    const normalized: Record<string, N8nConnection[]> = {};

    for (const [sourceNode, connectionData] of Object.entries(connections)) {
      if (Array.isArray(connectionData)) {
        // Handle array format: [connection1, connection2, ...]
        normalized[sourceNode] = connectionData.map(conn => ({
          node: conn.node || conn.targetNode || '',
          type: conn.type || 'main',
          index: conn.index || 0
        }));
      } else if (connectionData && typeof connectionData === 'object') {
        // Handle object format: { main: [[conn1]], ai_memory: [[conn2]] }
        const allConnections: N8nConnection[] = [];
        
        for (const [portType, portConnections] of Object.entries(connectionData)) {
          if (Array.isArray(portConnections)) {
            for (const portConnection of portConnections) {
              if (Array.isArray(portConnection)) {
                for (const conn of portConnection) {
                  allConnections.push({
                    node: conn.node || conn.targetNode || '',
                    type: portType,
                    index: conn.index || 0
                  });
                }
              }
            }
          }
        }
        
        normalized[sourceNode] = allConnections;
      }
    }

    return normalized;
  }

  /**
   * Normalize n8n nodes structure
   */
  private normalizeNodes(nodes: any[]): N8nNode[] {
    return nodes
      .filter(node => {
        // Filter out sticky notes as they are not functional nodes
        return node.type !== 'n8n-nodes-base.stickyNote';
      })
      .map(node => ({
        id: node.id || '',
        name: node.name || `Node ${node.id}`,
        type: node.type || '',
        typeVersion: node.typeVersion || 1,
        position: node.position || [0, 0],
        parameters: node.parameters || {},
        webhookId: node.webhookId
      }));
  }

  /**
   * Extract trigger nodes from workflow
   */
  extractTriggerNodes(workflow: N8nWorkflow): N8nNode[] {
    return workflow.nodes.filter(node => 
      node.type.includes('webhook') || 
      node.type.includes('trigger') ||
      node.type.includes('schedule') ||
      node.type.includes('manual')
    );
  }

  /**
   * Extract regular nodes (non-trigger) from workflow
   */
  extractRegularNodes(workflow: N8nWorkflow): N8nNode[] {
    return workflow.nodes.filter(node => 
      !node.type.includes('webhook') && 
      !node.type.includes('trigger') &&
      !node.type.includes('schedule') &&
      !node.type.includes('manual') &&
      !node.type.includes('stickyNote') &&
      !node.type.includes('note')
    );
  }
}
