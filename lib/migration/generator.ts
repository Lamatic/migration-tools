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

    // Filter out trigger node from regular nodes
    const regularNodes = nodesWithDependencies.filter(node => 
      node.nodeType !== 'webhookTriggerNode'
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
   */
  private findTriggerNode(nodes: LamaticNode[]): LamaticNode | undefined {
    return nodes.find(node => node.nodeType === 'webhookTriggerNode');
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
   * Format workflow for download
   */
  formatWorkflowForDownload(workflow: LamaticWorkflow): string {
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