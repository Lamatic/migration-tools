import { N8nWorkflow, N8nNode, N8nConnection } from './types';

/**
 * Parser for n8n workflow JSON files.
 * 
 * Handles parsing, validation, and normalization of n8n workflow structures.
 * Supports multiple n8n export formats including template exports and instance exports.
 */
export class N8nParser {
  /**
   * Parses n8n workflow JSON string into normalized N8nWorkflow structure.
   * 
   * @param jsonContent - Raw JSON string from n8n workflow export
   * @returns Normalized N8nWorkflow object with validated structure
   * @throws Error if JSON is invalid or workflow structure is malformed
   */
  parseWorkflow(jsonContent: string): N8nWorkflow {
    try {
      const workflow = JSON.parse(jsonContent);
      
      // Validate required workflow structure: nodes array must exist
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        throw new Error('Invalid n8n workflow structure: missing nodes array');
      }

      // Generate workflow name with fallback hierarchy for template/instance exports
      // Priority: explicit name > templateId > instanceId > trigger node name > default
      let workflowName = workflow.name;
      if (!workflowName) {
        if (workflow.meta?.templateId) {
          workflowName = `Template #${workflow.meta.templateId}`;
        } else if (workflow.meta?.instanceId) {
          workflowName = `Workflow Instance ${workflow.meta.instanceId.substring(0, 8)}`;
        } else {
          // Extract name from first trigger node as fallback
          const firstTrigger = workflow.nodes.find((n: any) => 
            n.type?.includes('webhook') || 
            n.type?.includes('trigger') ||
            n.type?.includes('schedule')
          );
          workflowName = firstTrigger?.name 
            ? `${firstTrigger.name} Workflow`
            : 'Untitled Workflow';
        }
      }

      // Normalize connection structure to handle both array and object formats
      const normalizedConnections = this.normalizeConnections(workflow.connections || {});
      
      // Normalize nodes: filter non-functional nodes and standardize structure
      const normalizedNodes = this.normalizeNodes(workflow.nodes);

      return {
        name: workflowName,
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
   * Validates workflow structure and compatibility for migration.
   * 
   * Checks for required elements, trigger nodes, and provides warnings for
   * non-critical issues that may affect migration quality.
   * 
   * @param workflow - Normalized n8n workflow to validate
   * @returns Validation result with errors (blocking) and warnings (non-blocking)
   */
  validateForMigration(workflow: N8nWorkflow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Workflow name is auto-generated if missing, so this is informational only
    if (!workflow.name) {
      warnings.push('Workflow name was auto-generated (original workflow missing name field)');
    }

    // Require at least one node for valid workflow
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
    }

    // Detect trigger nodes: webhook, trigger, or schedule types
    const triggerNodes = workflow.nodes.filter(node => 
      node.type.includes('webhook') || 
      node.type.includes('trigger') ||
      node.type.includes('schedule')
    );

    if (triggerNodes.length === 0) {
      warnings.push('No trigger nodes found - workflow may not be executable');
    }

    // Identify documentation nodes (sticky notes) that will be filtered out
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
   * Normalizes n8n connection structure to unified format.
   * 
   * Handles two n8n connection formats:
   * 1. Array format: [connection1, connection2, ...]
   * 2. Object format: { main: [[conn1]], ai_memory: [[conn2]] }
   * 
   * CRITICAL: Preserves outputIndex for switch/if nodes - the array index in
   * portConnections represents the branch/output path (0=first branch, 1=second, etc.)
   * 
   * @param connections - Raw n8n connections object (may be array or object format)
   * @returns Normalized connections map: sourceNodeName -> N8nConnection[]
   */
  private normalizeConnections(connections: Record<string, any>): Record<string, N8nConnection[]> {
    const normalized: Record<string, N8nConnection[]> = {};

    for (const [sourceNode, connectionData] of Object.entries(connections)) {
      if (Array.isArray(connectionData)) {
        // Handle array format: [connection1, connection2, ...]
        normalized[sourceNode] = connectionData.map((conn, outputIndex) => ({
          node: conn.node || conn.targetNode || '',
          type: conn.type || 'main',
          index: conn.index !== undefined ? conn.index : outputIndex, // Use outputIndex if conn.index not provided
          outputIndex: outputIndex // Preserve output index for switch/if nodes
        }));
      } else if (connectionData && typeof connectionData === 'object') {
        // Handle object format: { main: [[conn1]], ai_memory: [[conn2]], ai_tool: [[conn3]] }
        // Structure: portType -> [output0[], output1[], ...] where each output array contains connections
        // CRITICAL: Array index = outputIndex (branch path for switch/if nodes)
        const allConnections: N8nConnection[] = [];
        
        for (const [portType, portConnections] of Object.entries(connectionData)) {
          if (Array.isArray(portConnections)) {
            // Each array element represents a different output port/branch
            // outputIndex 0 = first branch, 1 = second branch, etc.
            portConnections.forEach((portConnection, outputIndex) => {
              if (Array.isArray(portConnection)) {
                for (const conn of portConnection) {
                  allConnections.push({
                    node: conn.node || conn.targetNode || '',
                    type: portType, // 'main', 'ai_memory', 'ai_languageModel', 'ai_tool', etc.
                    index: conn.index !== undefined ? conn.index : outputIndex,
                    outputIndex: outputIndex // Preserve for switch/if branch routing
                  });
                }
              }
            });
          }
        }
        
        normalized[sourceNode] = allConnections;
      }
    }

    return normalized;
  }

  /**
   * Normalizes n8n node structure and filters non-functional nodes.
   * 
   * Removes documentation nodes (sticky notes) and standardizes node properties
   * with default values for missing fields.
   * 
   * @param nodes - Raw n8n node array from workflow JSON
   * @returns Normalized N8nNode array with consistent structure
   */
  private normalizeNodes(nodes: any[]): N8nNode[] {
    return nodes
      .filter(node => {
        // Filter out sticky notes - they are documentation only, not executable nodes
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
   * Extracts all trigger nodes from workflow.
   * 
   * Identifies nodes that initiate workflow execution: webhooks, triggers, schedules, manual triggers.
   * 
   * @param workflow - Normalized n8n workflow
   * @returns Array of trigger nodes
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
   * Extracts all non-trigger nodes from workflow.
   * 
   * Returns all executable nodes excluding triggers, schedules, and documentation nodes.
   * 
   * @param workflow - Normalized n8n workflow
   * @returns Array of non-trigger executable nodes
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
