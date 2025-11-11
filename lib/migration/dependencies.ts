import { N8nWorkflow, N8nConnection, LamaticNode, LamaticConnection, LamaticConnectionDetail } from './types';

/**
 * Dependency builder for creating node connections and execution order
 * Converts n8n connections to Lamatic dependency structure
 */
export class DependencyBuilder {
  /**
   * Build dependencies from n8n workflow and mapped nodes
   */
  buildDependencies(
    n8nWorkflow: N8nWorkflow,
    mappedNodes: LamaticNode[]
  ): {
    nodesWithDependencies: LamaticNode[];
    connections: Record<string, LamaticConnection>;
    executionOrder: string[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // Log mapping statistics for debugging
    const mappedNodeNames = new Set(mappedNodes.map(n => n.nodeName));
    const n8nNodeNames = new Set(n8nWorkflow.nodes.map(n => n.name));
    const unmappedN8nNodes = Array.from(n8nNodeNames).filter(name => !mappedNodeNames.has(name));
    if (unmappedN8nNodes.length > 0) {
      warnings.push(`Some n8n nodes were not mapped: ${unmappedN8nNodes.join(', ')}`);
    }
    
    // Create node ID mappings
    const nodeIdMap = this.createNodeIdMappings(n8nWorkflow, mappedNodes);
    
    // Build node dependencies using the proper reverse logic
    // Pass nodeIdMap so trigger nodes and other mapped IDs are included in validation
    // Note: buildNodeDependencies now handles warnings internally and logs them
    // We could collect them here if needed, but console.warn is sufficient for now
    const nodesWithDependencies = this.buildNodeDependencies(n8nWorkflow, mappedNodes, nodeIdMap);
    
    // Build forward connections for Lamatic format
    const connections = this.buildLamaticConnections(n8nWorkflow, nodeIdMap);
    
    // CRITICAL: Validate connections consistency
    // Ensure all nodes in needs arrays have corresponding connections
    this.validateConnectionsConsistency(nodesWithDependencies, connections, warnings);
    
    // CRITICAL: Break cycles caused by splitInBatches loop-backs
    // This must be done BEFORE calculating execution order
    this.breakSplitInBatchesCycles(nodesWithDependencies, n8nWorkflow, nodeIdMap);
    
    // CRITICAL: Break cycles caused by merge nodes with fan-out patterns
    // Merge nodes can have multiple inputs, including from nodes that also feed other nodes
    // This creates diamond patterns that are valid, but can be detected as cycles
    this.breakMergeNodeCycles(nodesWithDependencies, n8nWorkflow, nodeIdMap);
    
    // CRITICAL: Additional cycle breaking - if a cycle involves a merge node,
    // check if it's actually a valid diamond pattern (one node feeds merge directly and indirectly)
    this.breakDiamondPatternCycles(nodesWithDependencies, n8nWorkflow, nodeIdMap);
    
    // CRITICAL: Break cycles where a node feeds both another node and a merge,
    // and that other node also feeds the merge (diamond pattern)
    // Example: GetFields → GET UNIPILE ACCOUNT → Merge, GetFields → Merge
    // Solution: Remove the dependency from GET UNIPILE ACCOUNT to GetFields
    // because Merge already depends on GetFields directly
    this.breakDiamondPatternCyclesAtSource(nodesWithDependencies, n8nWorkflow, nodeIdMap);
    
    // CRITICAL: Break cycles that go through merge nodes
    // If a cycle exists: A → ... → Merge → B → ... → A
    // and Merge depends on A, then we need to break the cycle
    // by removing one of the dependencies in the cycle
    this.breakMergeNodeCyclesInPaths(nodesWithDependencies, n8nWorkflow, nodeIdMap);
    
    // Calculate execution order - this will throw if circular dependencies exist
    let executionOrder: string[] = [];
    let maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        executionOrder = this.calculateExecutionOrder(nodesWithDependencies, new Map());
        break; // Success, exit loop
      } catch (error) {
        attempt++;
        if (error instanceof Error && error.message.includes('Circular dependency')) {
          if (attempt < maxAttempts) {
            // Try to break the cycle automatically
            console.warn(`[buildDependencies] Circular dependency detected, attempt ${attempt}/${maxAttempts} to fix...`);
            const cycleBroken = this.attemptBreakCycle(nodesWithDependencies, error.message);
            if (!cycleBroken) {
              // Couldn't break it automatically, log and throw
              console.error('Circular dependency detected. Node dependencies:');
              for (const node of nodesWithDependencies) {
                console.error(`  ${node.nodeName} (${node.nodeId}): needs [${node.needs.join(', ')}]`);
              }
              throw error;
            }
            // Continue to next attempt
          } else {
            // Final attempt failed, log and throw
            console.error('Circular dependency detected. Node dependencies:');
            for (const node of nodesWithDependencies) {
              console.error(`  ${node.nodeName} (${node.nodeId}): needs [${node.needs.join(', ')}]`);
            }
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
    
    // If we exited the loop without setting executionOrder, something went wrong
    if (executionOrder.length === 0) {
      throw new Error('Failed to calculate execution order after all cycle-breaking attempts');
    }
    
    return {
      nodesWithDependencies,
      connections,
      executionOrder,
      warnings
    };
  }

  /**
   * Build needs dependencies by analyzing both connections and data references
   */
  private buildNodeDependencies(
    n8nWorkflow: N8nWorkflow,
    lamaticNodes: LamaticNode[],
    nodeIdMap: Map<string, string> // Authoritative mappings created earlier (includes trigger nodes)
  ): LamaticNode[] {
    const n8nNodeNameToId = new Map<string, string>();
    const n8nNodeIdToLamaticId = new Map<string, string>();
    const n8nNodeNameToLamaticIds = new Map<string, string[]>(); // Allow duplicates
    const lamaticIdToN8nNode = new Map<string, any>();
    const warnings: string[] = [];

    // Build lookup maps for n8n workflow nodes (name -> id) — keep first id per name for simple lookups
    for (const n8nNode of n8nWorkflow.nodes) {
      if (!n8nNodeNameToId.has(n8nNode.name)) {
        n8nNodeNameToId.set(n8nNode.name, n8nNode.id);
      }
    }

    // Build n8nNodeId -> lamaticNodeId and name -> [lamaticNodeIds] only for lamaticNodes that exist (post-filter)
    // CRITICAL: Include IDs from nodeIdMap (so trigger node or other out-of-band ids are included)
    const validLamaticIds = new Set<string>([
      ...lamaticNodes.map(n => n.nodeId),
      ...Array.from(nodeIdMap.values()) // Include any additional lamatic IDs (e.g., trigger node)
    ]);

    // Populate maps from lamaticNodes (these are authoritative for nodes we are listing)
    for (const lamaticNode of lamaticNodes) {
      // Find n8n nodes that share the same name (may be multiple)
      const matchedN8nNodes = n8nWorkflow.nodes.filter(n => n.name === lamaticNode.nodeName);
      for (const n8nNode of matchedN8nNodes) {
        // Authoritative id mapping for nodes present in lamaticNodes
        n8nNodeIdToLamaticId.set(n8nNode.id, lamaticNode.nodeId);

        // Name -> list of lamatic ids (for duplicate names)
        const arr = n8nNodeNameToLamaticIds.get(n8nNode.name) ?? [];
        if (!arr.includes(lamaticNode.nodeId)) arr.push(lamaticNode.nodeId);
        n8nNodeNameToLamaticIds.set(n8nNode.name, arr);

        // Reverse map n8n node for the lamatic id
        lamaticIdToN8nNode.set(lamaticNode.nodeId, n8nNode);
      }
    }

    // Ensure lamaticIdToN8nNode also contains entries for any lamatic IDs known from nodeIdMap
    // This covers trigger nodes that were mapped earlier but not included in lamaticNodes array
    for (const n8nNode of n8nWorkflow.nodes) {
      const mappedLamaticId = nodeIdMap.get(n8nNode.id);
      if (mappedLamaticId && validLamaticIds.has(mappedLamaticId) && !lamaticIdToN8nNode.has(mappedLamaticId)) {
        lamaticIdToN8nNode.set(mappedLamaticId, n8nNode);
        // Also ensure name->ids contains it
        const arr = n8nNodeNameToLamaticIds.get(n8nNode.name) ?? [];
        if (!arr.includes(mappedLamaticId)) {
          arr.push(mappedLamaticId);
          n8nNodeNameToLamaticIds.set(n8nNode.name, arr);
        }
        // And authoritative id->lamatic mapping
        if (!n8nNodeIdToLamaticId.has(n8nNode.id)) {
          n8nNodeIdToLamaticId.set(n8nNode.id, mappedLamaticId);
        }
      }
    }

    // Sanity: filter name lists to only include ids present in validLamaticIds
    for (const [name, ids] of Array.from(n8nNodeNameToLamaticIds.entries())) {
      const filtered = ids.filter(id => validLamaticIds.has(id));
      if (filtered.length !== ids.length) {
        n8nNodeNameToLamaticIds.set(name, filtered);
      }
      if (filtered.length === 0) {
        n8nNodeNameToLamaticIds.delete(name);
      }
    }

    // Now rewrite and validate per lamatic node using the robust maps (and collect warnings)
    for (const lamaticNode of lamaticNodes) {
      lamaticNode.values = this.rewriteNameReferences(
        lamaticNode.values,
        n8nNodeNameToLamaticIds,
        n8nNodeIdToLamaticId,
        validLamaticIds,
        n8nWorkflow,
        warnings,
        lamaticNode // Pass current node for contextual decisions
      );

      // Final safety check (existing)
      lamaticNode.values = this.validateNodeReferences(lamaticNode.values, validLamaticIds);

      // Build the needs set
      const needs = new Set<string>();
      const n8nNode = lamaticIdToN8nNode.get(lamaticNode.nodeId);
      if (!n8nNode) {
        lamaticNode.needs = Array.from(needs);
        continue;
      }
      
      // CRITICAL: Prevent self-dependencies
      const currentNodeId = lamaticNode.nodeId;
      
      // 1. Find direct input connections (nodes that connect TO this node)
      // NOTE: connections are normalized to Record<string, N8nConnection[]> format
      // Always process connection dependencies - data references are additional, not replacements
      for (const [sourceNodeName, connectionArray] of Object.entries(n8nWorkflow.connections)) {
        // Handle normalized connection format: N8nConnection[] (flat array)
        if (Array.isArray(connectionArray)) {
          for (const conn of connectionArray) {
            if (!conn || !conn.node) continue;
            
            // CRITICAL: Match by node name (case-sensitive for accuracy)
            // For branch nodes (if/switch), ALL outputs should create dependencies
            // regardless of outputIndex - each branch target needs the branch node
            if (conn.node === n8nNode.name) {
              // This node receives input from sourceNodeName
              const sourceN8nId = n8nNodeNameToId.get(sourceNodeName);
              if (sourceN8nId) {
                const sourceLamaticId = n8nNodeIdToLamaticId.get(sourceN8nId);
                if (sourceLamaticId && sourceLamaticId !== currentNodeId) {
                  // Special handling: ai_memory connections don't create direct dependencies for target node
                  // ai_languageModel connections also don't create direct dependencies (they're used by agent, not vice versa)
                  // But main connections always create dependencies
                  const connectionType = conn.type || 'main';
                  if (connectionType === 'main') {
                    // Get source node once
                    const sourceN8nNode = n8nWorkflow.nodes.find(n => n.id === sourceN8nId);
                    
                    // Check if this is a splitInBatches loop-back (should not create dependency)
                    const isSplitInBatches = n8nNode.type === 'n8n-nodes-base.splitInBatches';
                    const sourceIsSplitInBatches = sourceN8nNode?.type === 'n8n-nodes-base.splitInBatches';
                    const isMergeNode = n8nNode.type === 'n8n-nodes-base.merge';
                    
                    // Special case: splitInBatches nodes can loop back to themselves for batch processing
                    // This is a valid pattern in n8n, but we need to handle it carefully
                    // splitInBatches has two outputs: 
                    //   - output 0: empty (done/end of loop) - this is the loop-back
                    //   - output 1: items to process (continues loop)
                    // When a node connects TO a splitInBatches node from AFTER the splitInBatches in the flow,
                    // it's a loop-back connection and should not create a dependency
                    // The splitInBatches node should depend on nodes BEFORE the loop, not after
                    if (isSplitInBatches && !sourceIsSplitInBatches) {
                      // Check if source node is a trigger or data source (should always create dependency)
                      const sourceNodeType = sourceN8nNode?.type || '';
                      const isTriggerOrDataSource = sourceNodeType.includes('trigger') || 
                                                     sourceNodeType.includes('Trigger') ||
                                                     sourceNodeType.includes('webhook') ||
                                                     sourceNodeType === 'n8n-nodes-base.googleSheets' ||
                                                     sourceNodeType === 'n8n-nodes-base.formTrigger';
                      
                      // If source is NOT a trigger/data source, this might be a loop-back
                      // Skip it to avoid creating a circular dependency
                      // The splitInBatches will process items in batches, and the loop-back is handled internally
                      if (!isTriggerOrDataSource) {
                        // This is likely a loop-back to splitInBatches - skip creating dependency to avoid cycle
                        continue;
                      }
                    }
                    
                    // CRITICAL: For branch nodes (if/switch), ensure ALL branch targets get the dependency
                    // The outputIndex doesn't matter for needs - all branches depend on the branch node
                    // This ensures proper execution order and connection tracking
                    const isBranchNode = sourceN8nNode?.type === 'n8n-nodes-base.if' || 
                                       sourceN8nNode?.type === 'n8n-nodes-base.switch';
                    
                    // Special case: Merge nodes can have multiple inputs from the same source
                    // When a node connects to a merge node with multiple indices (e.g., index 0, 1, 2),
                    // those represent different input ports of the merge. However, we should only
                    // create ONE dependency from the merge to that source node, not multiple dependencies.
                    // The merge node legitimately depends on all its input sources, but we need to
                    // be careful not to create duplicate dependencies that can cause false cycles.
                    
                    // Check if this is a merge node and if we've already added this dependency
                    // (to avoid duplicate dependencies for multiple input indices)
                    if (isMergeNode) {
                      // We'll add it anyway - the deduplication happens in breakMergeNodeCycles
                      needs.add(sourceLamaticId);
                    } else {
                      // Otherwise, create the dependency normally
                      // This handles both regular connections and branch node connections
                      needs.add(sourceLamaticId);
                    }
                  }
                }
              } else {
                // Log warning if source node not found in mapping
                if (!n8nNodeNameToId.has(sourceNodeName)) {
                  warnings.push(`Source node '${sourceNodeName}' not found in node mapping (connecting to '${n8nNode.name}')`);
                }
              }
            }
          }
        } else {
          // Log warning for unexpected connection format
          warnings.push(`Unexpected connection format for node '${sourceNodeName}': expected array, got ${typeof connectionArray}`);
        }
      }
      
      // 2. Find data references in parameters (only for specific node types)
      // Memory nodes get context through the agent, not directly from webhook
      if (lamaticNode.nodeType !== 'LLMNode' || lamaticNode.nodeName !== 'Window Buffer Memory') {
        const paramString = JSON.stringify(n8nNode.parameters);
        
        // Find $('Node Name') references (with optional suffixes)
        const nodeRefPattern = /\$\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = nodeRefPattern.exec(paramString)) !== null) {
          const nodeName = match[1];
          // Use the authoritative maps to resolve to lamatic id(s)
          const candidates = n8nNodeNameToLamaticIds.get(nodeName) || [];
          if (candidates.length === 1) {
            const refId = candidates[0];
            // Prevent self-dependencies
            if (refId !== currentNodeId) {
              needs.add(refId);
            }
          } else {
            // Try disambiguation by finding matching n8n node id and mapping via n8nNodeIdToLamaticId
            const n8nMatches = n8nWorkflow.nodes.filter(n => n.name === nodeName);
            if (n8nMatches.length === 1) {
              const refN8nId = n8nMatches[0].id;
              const refLamaticId = n8nNodeIdToLamaticId.get(refN8nId);
              if (refLamaticId && refLamaticId !== currentNodeId) {
                needs.add(refLamaticId);
              } else if (!refLamaticId) {
                warnings.push(`Reference to '${nodeName}' could not be resolved to a lamatic nodeId (n8n id ${refN8nId})`);
              }
            } else if (candidates.length > 1 || n8nMatches.length > 1) {
              warnings.push(`Ambiguous or missing mapping for name reference '${nodeName}' in node '${lamaticNode.nodeName}'. Candidates: [${candidates.join(', ')}]`);
            }
          }
        }
        
        // Find $node["Node Name"] references
        const nodeRefPattern2 = /\$node\[['"]([^'"]+)['"]\]/g;
        while ((match = nodeRefPattern2.exec(paramString)) !== null) {
          const nodeName = match[1];
          const candidates = n8nNodeNameToLamaticIds.get(nodeName) || [];
          if (candidates.length === 1) {
            const refId = candidates[0];
            // Prevent self-dependencies
            if (refId !== currentNodeId) {
              needs.add(refId);
            }
          } else {
            const n8nMatches = n8nWorkflow.nodes.filter(n => n.name === nodeName);
            if (n8nMatches.length === 1) {
              const refN8nId = n8nMatches[0].id;
              const refLamaticId = n8nNodeIdToLamaticId.get(refN8nId);
              if (refLamaticId && refLamaticId !== currentNodeId) {
                needs.add(refLamaticId);
              }
            }
          }
        }
        
        // Find $json references
        // CRITICAL: In n8n, $json refers to data from the PREVIOUS node in the execution chain,
        // NOT necessarily from the trigger. Connection-based dependencies already handle this correctly.
        // We should NOT add trigger dependencies for $json references because:
        // 1. If a node has incoming connections, $json comes from the source node (already in needs)
        // 2. If a node has NO incoming connections, it's a direct child of the trigger, and the trigger
        //    should already be in needs from connection analysis (if it's truly connected to trigger)
        // 
        // REMOVED: Automatic trigger dependency addition for $json - this was causing false cycles
        // Connection-based dependencies are sufficient and correct
        // 
        // NOTE: n8n-nodes-base.form (form completion) is mapped to webhookTriggerNode but is NOT a trigger.
        // Only n8n-nodes-base.formTrigger is the actual trigger. We should distinguish between them.
        // For now, we don't add any $json dependencies - connections handle everything.
      }
      
      // Final safety check: remove any self-dependencies that might have slipped through
      needs.delete(currentNodeId);
      
      lamaticNode.needs = Array.from(needs);
    }
    
    // Special case: LLM with memory dependency
    // If there's a memory node and an LLM node, establish the dependency
    for (const node of lamaticNodes) {
      if (node.nodeType === 'LLMNode') {
        // Check if this is an LLM model node (not memory)
        const isModelNode = node.nodeName?.toLowerCase().includes('gemini') || 
                           node.nodeName?.toLowerCase().includes('chat') ||
                           node.nodeName?.toLowerCase().includes('gpt') ||
                           node.nodeName?.toLowerCase().includes('claude');
        
        if (isModelNode) {
          const memoryNode = lamaticNodes.find(n => 
            n.nodeType === 'LLMNode' && 
            n.nodeId !== node.nodeId && // Prevent self-dependency
            (n.nodeName?.toLowerCase().includes('memory') || 
             n.nodeName?.toLowerCase().includes('buffer'))
          );
          
          if (memoryNode && !node.needs.includes(memoryNode.nodeId)) {
            node.needs.push(memoryNode.nodeId);
          }
        }
      }
    }
    
    // CRITICAL: Build top-level 'condition' array for conditionNode nodes
    // Lamatic uses conditionNode with a top-level condition array that maps branch labels to target nodeIds
    // This replaces the connections object for condition nodes
    this.buildConditionArrays(lamaticNodes, n8nWorkflow, nodeIdMap, n8nNodeNameToId, n8nNodeIdToLamaticId);
    
    // Debug: log valid node IDs for troubleshooting
    console.debug('[buildNodeDependencies] validLamaticIds:', Array.from(validLamaticIds).join(', '));
    
    // Log warnings (will be collected by caller)
    for (const w of warnings) {
      console.warn('[buildNodeDependencies]', w);
    }
    
    return lamaticNodes;
  }

  /**
   * Recursively rewrite n8n-style name references $('Node Name') to id-based $('nodeId') in any string fields
   * CRITICAL: Only converts references if the target nodeId actually exists and is unambiguous
   * Handles multiple n8n expression patterns:
   * - $('Node Name')
   * - $('Node Name').item.json.field
   * - $('Node Name').first().json.field
   * - $node["Node Name"].json.field
   * 
   * CRITICAL: Never treats $json as a node name - it's a data reference, not a node reference
   */
  private rewriteNameReferences(
    obj: any,
    nameToIds: Map<string, string[]>,
    n8nIdToLamaticId: Map<string, string>,
    validNodeIds: Set<string>,
    n8nWorkflow: N8nWorkflow,
    warnings: string[],
    currentLamaticNode?: LamaticNode
  ): any {
    if (obj == null) return obj;

    if (typeof obj === 'string') {
      let result = obj;
      
      // CRITICAL: First, remove any invalid $('$json') patterns - $json is NOT a node
      result = result.replace(/\$\(['"]\$json['"]\)/g, '$json');
      
      // Pattern 1: $('Node Name') - capture the full expression with any suffix
      // Match: $('Node Name') followed by optional .item.json.field, .first().json.field, etc.
      // SKIP if the name is '$json' - it's not a node reference
      result = result.replace(/\$\(['"]([^'"]+)['"]\)/g, (match, name: string) => {
        const trimmedName = name.trim();
        
        // CRITICAL: Never treat $json as a node name
        if (trimmedName === '$json' || trimmedName.startsWith('$json')) {
          return '$json'; // Return plain $json, not a node reference
        }
        
        // Resolve to nodeId
        const resolvedId = this.resolveNodeNameToId(trimmedName, nameToIds, n8nIdToLamaticId, validNodeIds, n8nWorkflow, warnings, currentLamaticNode);
        
        if (resolvedId) {
          return `$('${resolvedId}')`;
        }
        // If can't resolve and it looks like a data reference (starts with $), keep as $json
        if (trimmedName.startsWith('$')) {
          return '$json';
        }
        return match; // Keep original if can't resolve
      });
      
      // Pattern 2: $node["Node Name"] or $node['Node Name'] - convert to $('nodeId')
      // SKIP if the name is '$json'
      result = result.replace(/\$node\[['"]([^'"]+)['"]\]/g, (match, name: string) => {
        const trimmedName = name.trim();
        
        // CRITICAL: Never treat $json as a node name
        if (trimmedName === '$json' || trimmedName.startsWith('$json')) {
          return '$json';
        }
        
        const resolvedId = this.resolveNodeNameToId(trimmedName, nameToIds, n8nIdToLamaticId, validNodeIds, n8nWorkflow, warnings, currentLamaticNode);
        
        if (resolvedId) {
          return `$('${resolvedId}')`;
        }
        // If can't resolve and it looks like a data reference, return $json
        if (trimmedName.startsWith('$')) {
          return '$json';
        }
        return match;
      });
      
      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map(v => this.rewriteNameReferences(v, nameToIds, n8nIdToLamaticId, validNodeIds, n8nWorkflow, warnings, currentLamaticNode));
    }

    if (typeof obj === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = this.rewriteNameReferences(v, nameToIds, n8nIdToLamaticId, validNodeIds, n8nWorkflow, warnings, currentLamaticNode);
      }
      return out;
    }

    return obj;
  }

  /**
   * Resolves a node name to a valid Lamatic node ID
   * Returns the nodeId if found and unique, null otherwise
   * CRITICAL: Never resolves $json - it's a data reference, not a node name
   */
  private resolveNodeNameToId(
    nodeName: string,
    nameToIds: Map<string, string[]>,
    n8nIdToLamaticId: Map<string, string>,
    validNodeIds: Set<string>,
    n8nWorkflow: N8nWorkflow,
    warnings: string[],
    currentLamaticNode?: LamaticNode
  ): string | null {
    // CRITICAL: Never treat $json as a node name
    if (nodeName === '$json' || nodeName.startsWith('$json') || nodeName.startsWith('$')) {
      return null; // $json is a data reference, not a node
    }
    
    // 1) Exact single candidate by name
    const candidates = nameToIds.get(nodeName) || [];
    if (candidates.length === 1) {
      const candidateId = candidates[0];
      if (validNodeIds.has(candidateId)) {
        return candidateId;
      }
    }

    // 2) Try to find the unique n8n node with that name, then use n8nId->lamatic map
    const n8nMatches = n8nWorkflow.nodes.filter(n => n.name === nodeName);
    if (n8nMatches.length === 1) {
      const lamaticId = n8nIdToLamaticId.get(n8nMatches[0].id);
      if (lamaticId && validNodeIds.has(lamaticId)) {
        return lamaticId;
      }
      const ctx = currentLamaticNode ? ` for node '${currentLamaticNode.nodeName}'` : '';
      warnings.push(`Couldn't resolve name '${nodeName}' to a valid lamaticId${ctx}.`);
      return null;
    }

    // 3) Ambiguous: multiple lamatic ids for that name or multiple n8n nodes with same name
    if (candidates.length > 1 || n8nMatches.length > 1) {
      const ctx = currentLamaticNode ? ` in node '${currentLamaticNode.nodeName}'` : '';
      warnings.push(`Ambiguous name reference '${nodeName}'${ctx}. Candidates (lamaticIds): [${candidates.join(', ')}]; matching n8n nodes: ${n8nMatches.length}`);
      return null;
    }

    // 4) Not found at all
    const ctx = currentLamaticNode ? ` in node '${currentLamaticNode.nodeName}'` : '';
    warnings.push(`Unresolved name reference '${nodeName}'${ctx}`);
    return null;
  }

  /**
   * Validates all $('nodeId') references point to existing nodes
   * Removes or fixes invalid references
   * CRITICAL: Never treats $json as a node ID - it's a data reference
   */
  private validateNodeReferences(
    obj: any,
    validNodeIds: Set<string>
  ): any {
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
          continue; // Skip this match, it's not a node reference
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
      
      // Clean up extra whitespace
      return result.replace(/\s+/g, ' ').trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(v => this.validateNodeReferences(v, validNodeIds)).filter(v => v !== '');
    }
    
    if (typeof obj === 'object') {
      const out: Record<string, any> = {};
      // Fields that must be preserved even if empty (required fields)
      const requiredFields = ['flowId', 'requestInput', 'subflowId'];
      
      for (const [k, v] of Object.entries(obj)) {
        const validated = this.validateNodeReferences(v, validNodeIds);
        // Preserve required fields even if empty, or include non-empty values
        const isRequiredField = requiredFields.includes(k);
        if (isRequiredField || validated !== '' || typeof validated === 'number' || typeof validated === 'boolean' || validated === null || (Array.isArray(validated) && validated.length > 0)) {
          out[k] = validated;
        }
      }
      return out;
    }
    
    return obj;
  }

  /**
   * Check if a node has data references in its parameters
   */
  private hasDataReferences(n8nNode: any, lamaticNode: LamaticNode): boolean {
    // Skip memory nodes
    if (lamaticNode.nodeType === 'LLMNode' && lamaticNode.nodeName === 'Window Buffer Memory') {
      return false;
    }
    
    const paramString = JSON.stringify(n8nNode.parameters);
    
    // Check for $json references
    const jsonReferences = paramString.match(/\$json\./g) || [];
    if (jsonReferences.length > 0) {
      return true;
    }
    
    // Check for $('Node Name') references
    const nodeReferences = paramString.match(/\$\(['"](.*?)['"]\)/g) || [];
    if (nodeReferences.length > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Create mappings from n8n node names/IDs to Lamatic node IDs
   */
  private createNodeIdMappings(
    n8nWorkflow: N8nWorkflow,
    mappedNodes: LamaticNode[]
  ): Map<string, string> {
    const mappings = new Map<string, string>();
    
    for (const n8nNode of n8nWorkflow.nodes) {
      const lamaticNode = mappedNodes.find(node => 
        node.nodeName === n8nNode.name
      );
      
      if (lamaticNode) {
        mappings.set(n8nNode.id, lamaticNode.nodeId);
        mappings.set(n8nNode.name, lamaticNode.nodeId);
      }
    }
    
    return mappings;
  }

  /**
   * Build reverse connection map (target node ← source nodes)
   * This analyzes n8n connections to determine what each node needs
   */
  private buildReverseConnections(
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): Map<string, string[]> {
    const nodeInputs = new Map<string, string[]>();
    
    // Initialize all nodes with empty inputs
    for (const nodeId of Array.from(nodeIdMap.values())) {
      nodeInputs.set(nodeId, []);
    }
    
    // Parse n8n connections to build dependency map
    // Key insight: If A connects to B in n8n, then B needs A in Lamatic
    for (const [sourceNodeName, connectionData] of Object.entries(n8nWorkflow.connections)) {
      // Find the source node in the n8n workflow
      const sourceNode = n8nWorkflow.nodes.find(n => n.name === sourceNodeName);
      if (!sourceNode) continue;
      
      const sourceLamaticId = nodeIdMap.get(sourceNode.id);
      if (!sourceLamaticId) continue;
      
      // Handle the n8n connection structure: { "main": [[{node, type, index}]] }
      if (typeof connectionData === 'object' && connectionData !== null) {
        for (const [portType, portConnections] of Object.entries(connectionData)) {
          if (Array.isArray(portConnections)) {
            for (const portConnection of portConnections) {
              if (Array.isArray(portConnection)) {
                for (const connection of portConnection) {
                  if (!connection || !connection.node) continue;
                  
                  // Find the target node in the n8n workflow
                  const targetNode = n8nWorkflow.nodes.find(n => n.name === connection.node);
                  if (!targetNode) continue;
                  
                  const targetLamaticId = nodeIdMap.get(targetNode.id);
                  if (!targetLamaticId) continue;
                  
                  // Add dependency: target node needs source node
                  const currentInputs = nodeInputs.get(targetLamaticId) || [];
                  if (!currentInputs.includes(sourceLamaticId)) {
                    currentInputs.push(sourceLamaticId);
                    nodeInputs.set(targetLamaticId, currentInputs);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return nodeInputs;
  }

  /**
   * Build Lamatic connections format
   */
  private buildLamaticConnections(
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): Record<string, LamaticConnection> {
    const connections: Record<string, LamaticConnection> = {};
    
    // Initialize all nodes in connections
    for (const nodeId of Array.from(nodeIdMap.values())) {
      connections[nodeId] = {
        flowType: 'linear',
        executionOrder: 0,
        connections: {}
      };
    }
    
    // Build detailed connections based on actual n8n connections
    // NOTE: connections are normalized by parser to Record<string, N8nConnection[]>
    // So connectionData is already an array of connections, not nested structure
    // CRITICAL: Skip conditionNode nodes - they use top-level 'condition' array instead of connections
    for (const [sourceNodeName, connectionArray] of Object.entries(n8nWorkflow.connections)) {
      // Find the source node in the n8n workflow
      const sourceNode = n8nWorkflow.nodes.find(n => n.name === sourceNodeName);
      if (!sourceNode) {
        console.warn(`[buildLamaticConnections] Source node not found: ${sourceNodeName}`);
        continue;
      }
      
      const sourceLamaticId = nodeIdMap.get(sourceNode.id);
      if (!sourceLamaticId) {
        console.warn(`[buildLamaticConnections] Source Lamatic ID not found for node: ${sourceNodeName} (id: ${sourceNode.id})`);
        continue;
      }
      if (!connections[sourceLamaticId]) {
        console.warn(`[buildLamaticConnections] Connection entry not initialized for: ${sourceLamaticId}`);
        continue;
      }
      
      // CRITICAL: Skip building connections for conditionNode - they use top-level 'condition' array
      // Find the lamatic node to check its type
      const sourceLamaticNode = Array.from(nodeIdMap.entries()).find(([n8nId, lamaticId]) => lamaticId === sourceLamaticId);
      if (sourceLamaticNode) {
        const sourceN8nId = sourceLamaticNode[0];
        const sourceN8nNode = n8nWorkflow.nodes.find(n => n.id === sourceN8nId);
        // If this is an if/switch node, it will be mapped to conditionNode and should be skipped
        if (sourceN8nNode && (sourceN8nNode.type === 'n8n-nodes-base.if' || sourceN8nNode.type === 'n8n-nodes-base.switch')) {
          // Skip - conditionNode uses top-level 'condition' array, not connections object
          continue;
        }
      }
      
      // Handle normalized connection format: N8nConnection[] (flat array)
      if (Array.isArray(connectionArray)) {
        // Group connections by port type and output index for proper structure
        const connectionsByPort: Record<string, Record<number, N8nConnection[]>> = {};
        
        for (const connection of connectionArray) {
          if (!connection || !connection.node) {
            console.warn(`[buildLamaticConnections] Invalid connection object for ${sourceNodeName}`);
            continue;
          }
          
          const portType = connection.type || 'main';
          // CRITICAL: Use outputIndex if available (for switch/if branches), otherwise use index
          // outputIndex comes from the array position in n8n connections structure
          const outputIndex = connection.outputIndex !== undefined ? connection.outputIndex : 
                              (typeof connection.index === 'number' ? connection.index : 0);
          
          if (!connectionsByPort[portType]) {
            connectionsByPort[portType] = {};
          }
          if (!connectionsByPort[portType][outputIndex]) {
            connectionsByPort[portType][outputIndex] = [];
          }
          
          connectionsByPort[portType][outputIndex].push(connection);
        }
        
        // Process grouped connections
        for (const [portType, connectionsByIndex] of Object.entries(connectionsByPort)) {
          // Map n8n port type to Lamatic connection type
          // Find target node for better mapping (use first connection's target if available)
          let targetNodeForMapping = null;
          const firstOutputIndex = Object.keys(connectionsByIndex)[0];
          if (firstOutputIndex) {
            const firstConnList = connectionsByIndex[parseInt(firstOutputIndex, 10)];
            if (firstConnList && firstConnList.length > 0) {
              const firstConnection = firstConnList[0];
              targetNodeForMapping = n8nWorkflow.nodes.find(n => n.name === firstConnection.node);
            }
          }
          const lamaticPortType = this.mapPortTypeToLamatic(portType, sourceNode, targetNodeForMapping || null);
          
          // Ensure connection structure exists for this port type
          if (!connections[sourceLamaticId].connections[lamaticPortType]) {
            connections[sourceLamaticId].connections[lamaticPortType] = [];
          }
          
          // CRITICAL: For branch nodes, we need to ensure all output indices are properly initialized
          // Get all output indices and ensure array is dense (no gaps)
          const outputIndices = Object.keys(connectionsByIndex)
            .map(k => parseInt(k, 10))
            .sort((a, b) => a - b);
          
          // Get maximum output index to initialize array properly
          const maxOutputIndex = outputIndices.length > 0 ? Math.max(...outputIndices) : -1;
          
          // CRITICAL: Initialize array to be dense (all indices from 0 to maxOutputIndex must exist)
          // This ensures branch nodes have proper structure: [output0, output1, output2, ...]
          if (maxOutputIndex >= 0) {
            while (connections[sourceLamaticId].connections[lamaticPortType].length <= maxOutputIndex) {
              connections[sourceLamaticId].connections[lamaticPortType].push([]);
            }
          }
          
          // Process each output index in order
          for (const outputIndex of outputIndices) {
            const conns = connectionsByIndex[outputIndex];
            if (!conns || conns.length === 0) {
              // Even if no connections, ensure the array slot exists for branch nodes
              // This maintains the dense array structure
              if (outputIndex >= 0 && !connections[sourceLamaticId].connections[lamaticPortType][outputIndex]) {
                connections[sourceLamaticId].connections[lamaticPortType][outputIndex] = [];
              }
              continue;
            }
            
            // Ensure this specific output index exists (should already exist from above, but double-check)
            if (!connections[sourceLamaticId].connections[lamaticPortType][outputIndex]) {
              connections[sourceLamaticId].connections[lamaticPortType][outputIndex] = [];
            }
            
            // Add all connections for this output index
            for (const connection of conns) {
              // Find the target node in the n8n workflow
              const targetNode = n8nWorkflow.nodes.find(n => n.name === connection.node);
              if (!targetNode) {
                console.warn(`[buildLamaticConnections] Target node not found: ${connection.node} (from ${sourceNodeName})`);
                continue;
              }
              
              const targetLamaticId = nodeIdMap.get(targetNode.id);
              if (!targetLamaticId) {
                console.warn(`[buildLamaticConnections] Target Lamatic ID not found for node: ${connection.node} (id: ${targetNode.id})`);
                continue;
              }
              
              // Add connection detail
              const connectionDetail: LamaticConnectionDetail = {
                nodeId: targetLamaticId,
                type: lamaticPortType,
                index: connection.index ?? 0,
                outputIndex,
                flowContext: this.getFlowContext(lamaticPortType)
              };
              
              connections[sourceLamaticId].connections[lamaticPortType][outputIndex].push(connectionDetail);
            }
          }
        }
      } else {
        console.warn(`[buildLamaticConnections] Unexpected connection format for ${sourceNodeName}: ${typeof connectionArray}`);
      }
    }
    
    return connections;
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(
    nodes: LamaticNode[],
    nodeInputs: Map<string, string[]>
  ): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    // First, clean up any self-dependencies that might have slipped through
    for (const node of nodes) {
      if (node.needs) {
        node.needs = node.needs.filter(depId => depId !== node.nodeId);
      }
    }
    
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        // More detailed error with node name
        const node = nodes.find(n => n.nodeId === nodeId);
        const nodeName = node?.nodeName || nodeId;
        const visitingNodes = Array.from(visiting).map(id => {
          const n = nodes.find(n => n.nodeId === id);
          return n?.nodeName || id;
        }).join(' -> ');
        throw new Error(`Circular dependency detected: ${visitingNodes} -> ${nodeName}. This may be caused by splitInBatches loop-back connections or self-references.`);
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visiting.add(nodeId);
      
      // Visit dependencies first - get from node.needs array
      const node = nodes.find(n => n.nodeId === nodeId);
      const dependencies = node?.needs || [];
      for (const dep of dependencies) {
        // Skip self-dependencies (shouldn't happen, but safety check)
        if (dep !== nodeId) {
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
   * Get flow context based on connection type
   */
  private getFlowContext(portType: string): string {
    switch (portType) {
      case 'ai_memory':
      case 'ai_languageModel':
        return 'ai_pipeline';
      case 'main':
      default:
        return 'linear';
    }
  }

  /**
   * Map n8n port types to Lamatic connection types
   */
  private mapPortTypeToLamatic(n8nPortType: string, sourceNode: any, targetNode: any): string {
    // Use the n8n port type directly if it's already a Lamatic type
    if (['main', 'ai_memory', 'ai_languageModel'].includes(n8nPortType)) {
      return n8nPortType;
    }
    
    // Map based on node types and names
    if (sourceNode.type.includes('memory') || sourceNode.name.toLowerCase().includes('memory')) {
      return 'ai_memory';
    }
    
    if (sourceNode.type.includes('llm') || sourceNode.type.includes('gemini') || 
        sourceNode.type.includes('chat') || sourceNode.name.toLowerCase().includes('gemini')) {
      return 'ai_languageModel';
    }
    
    // Default to main for most connections
    return 'main';
  }

  /**
   * Map n8n connection types to Lamatic connection types (legacy method)
   */
  private mapConnectionType(n8nType: string, sourceNodeId: string, targetNodeId: string, n8nWorkflow: N8nWorkflow): string {
    // Find the source and target nodes in the original n8n workflow
    const sourceNode = n8nWorkflow.nodes.find(n => n.id === sourceNodeId);
    const targetNode = n8nWorkflow.nodes.find(n => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) {
      return 'main';
    }
    
    // Memory nodes typically connect via ai_memory
    if (sourceNode.type.includes('memory') || targetNode.type.includes('memory') || 
        sourceNode.name.toLowerCase().includes('memory') || targetNode.name.toLowerCase().includes('memory')) {
      return 'ai_memory';
    }
    
    // LLM nodes typically connect via ai_languageModel
    if (sourceNode.type.includes('llm') || targetNode.type.includes('llm') || 
        sourceNode.type.includes('gemini') || targetNode.type.includes('gemini') ||
        sourceNode.type.includes('chat') || targetNode.type.includes('chat')) {
      return 'ai_languageModel';
    }
    
    // Default to main for most connections
    return 'main';
  }

  /**
   * Break cycles caused by splitInBatches loop-back connections
   * splitInBatches nodes process items in batches and loop back to themselves
   * We need to remove dependencies from splitInBatches to nodes that come AFTER it in the flow
   */
  private breakSplitInBatchesCycles(
    nodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): void {
    // Find all splitInBatches nodes
    const splitInBatchesNodes = nodes.filter(node => {
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === node.nodeId;
      });
      return n8nNode?.type === 'n8n-nodes-base.splitInBatches';
    });

    if (splitInBatchesNodes.length === 0) return;

    // For each splitInBatches node, find nodes that come AFTER it in the flow
    // by following forward connections from the splitInBatches node
    for (const splitNode of splitInBatchesNodes) {
      const n8nSplitNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === splitNode.nodeId;
      });
      if (!n8nSplitNode) continue;

      console.log(`[breakSplitInBatchesCycles] Processing splitInBatches node: ${splitNode.nodeName} (${splitNode.nodeId})`);
      console.log(`[breakSplitInBatchesCycles] Current needs: [${splitNode.needs.join(', ')}]`);

      // Find all nodes reachable from this splitInBatches node (nodes AFTER it)
      const nodesAfterSplit = new Set<string>();
      this.findNodesAfterSplitInBatches(
        n8nSplitNode.name,
        n8nWorkflow,
        nodeIdMap,
        nodesAfterSplit,
        new Set()
      );

      console.log(`[breakSplitInBatchesCycles] Nodes after ${splitNode.nodeName}: [${Array.from(nodesAfterSplit).join(', ')}]`);

      // Remove dependencies from splitInBatches to any nodes that come AFTER it
      // These are loop-back connections that should not create dependencies
      const originalNeeds = [...splitNode.needs];
      splitNode.needs = splitNode.needs.filter(depId => {
        // Check if this dependency is a node that comes AFTER splitInBatches
        const comesAfter = nodesAfterSplit.has(depId);
        if (comesAfter) {
          const depNode = nodes.find(n => n.nodeId === depId);
          console.log(`[breakSplitInBatchesCycles] Breaking cycle: ${splitNode.nodeName} removing dependency on ${depNode?.nodeName || depId} (loop-back connection)`);
        }
        return !comesAfter;
      });

      console.log(`[breakSplitInBatchesCycles] After filtering needs: [${splitNode.needs.join(', ')}]`);
    }
  }

  /**
   * Break cycles caused by merge nodes with fan-out patterns
   * Merge nodes can receive inputs from multiple sources. When a node feeds multiple inputs
   * to a merge (via different indices), and also feeds other nodes that eventually feed the merge,
   * this creates diamond patterns that are valid but can be detected as cycles.
   * 
   * The fix: If a node connects to a merge node with multiple indices, and those indices
   * represent different inputs to the merge, we should only create ONE dependency from merge
   * to that source node (not multiple dependencies for each index).
   */
  private breakMergeNodeCycles(
    nodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): void {
    // Find all merge nodes
    const mergeNodes = nodes.filter(node => {
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === node.nodeId;
      });
      return n8nNode?.type === 'n8n-nodes-base.merge';
    });

    if (mergeNodes.length === 0) return;

    for (const mergeNode of mergeNodes) {
      // For merge nodes, deduplicate dependencies - if a node connects to merge with
      // multiple indices, we only need one dependency
      const uniqueNeeds = new Set<string>(mergeNode.needs);
      mergeNode.needs = Array.from(uniqueNeeds);
    }
  }

  /**
   * Break cycles that are actually diamond patterns
   * Diamond pattern: Node A → Node B → Merge, and Node A → Merge directly
   * This creates: Merge → A → B → Merge (appears as cycle, but is valid diamond)
   * 
   * Solution: If Merge depends on A (direct), and A connects to B, and B connects to Merge,
   * then remove B from Merge's needs (keep only A, the root of the diamond).
   */
  private breakDiamondPatternCycles(
    nodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): void {
    // Find all merge nodes
    const mergeNodes = nodes.filter(node => {
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === node.nodeId;
      });
      return n8nNode?.type === 'n8n-nodes-base.merge';
    });

    if (mergeNodes.length === 0) return;

    for (const mergeNode of mergeNodes) {
      const n8nMergeNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === mergeNode.nodeId;
      });
      if (!n8nMergeNode) continue;

      console.log(`[breakDiamondPatternCycles] Processing merge node: ${mergeNode.nodeName}`);
      console.log(`[breakDiamondPatternCycles] Current needs: [${mergeNode.needs.join(', ')}]`);

      // Find all nodes that connect directly to this merge (these are the direct inputs)
      const directInputs = new Set<string>();
      for (const [sourceNodeName, connectionArray] of Object.entries(n8nWorkflow.connections)) {
        if (Array.isArray(connectionArray)) {
          for (const conn of connectionArray) {
            if (conn?.node === n8nMergeNode.name && conn.type === 'main') {
              const sourceN8nNode = n8nWorkflow.nodes.find(n => n.name === sourceNodeName);
              if (sourceN8nNode) {
                const sourceLamaticId = nodeIdMap.get(sourceN8nNode.id);
                if (sourceLamaticId) {
                  directInputs.add(sourceLamaticId);
                  console.log(`[breakDiamondPatternCycles] Direct input: ${sourceNodeName} (${sourceLamaticId})`);
                }
              }
            }
          }
        }
      }

      // For each node in merge's needs, check if it's reachable from a direct input
      // If so, it's an indirect dependency and should be removed (diamond pattern)
      const needsToRemove = new Set<string>();
      for (const needId of mergeNode.needs) {
        // Skip if this need is itself a direct input (keep it)
        if (directInputs.has(needId)) {
          console.log(`[breakDiamondPatternCycles] Keeping direct input: ${nodes.find(n => n.nodeId === needId)?.nodeName || needId}`);
          continue;
        }

        const needNode = nodes.find(n => n.nodeId === needId);
        if (!needNode) continue;

        const needN8nNode = n8nWorkflow.nodes.find(n => {
          const mappedId = nodeIdMap.get(n.id);
          return mappedId === needId;
        });
        if (!needN8nNode) continue;

        // Check if this need is reachable from any direct input
        for (const directInputId of Array.from(directInputs)) {
          const directInputNode = nodes.find(n => n.nodeId === directInputId);
          if (!directInputNode) continue;

          const directInputN8nNode = n8nWorkflow.nodes.find(n => {
            const mappedId = nodeIdMap.get(n.id);
            return mappedId === directInputId;
          });
          if (!directInputN8nNode) continue;

          // Check if need is reachable from directInput
          if (this.isReachableThroughMain(directInputN8nNode.name, needN8nNode.name, n8nWorkflow, nodeIdMap, new Set())) {
            // This is an indirect dependency - remove it
            console.log(`[breakDiamondPatternCycles] Removing indirect dependency: ${mergeNode.nodeName} removing ${needNode.nodeName} (reachable from direct input ${directInputNode.nodeName})`);
            needsToRemove.add(needId);
            break; // Found a path, no need to check other direct inputs
          }
        }
      }

      // Remove the indirect dependencies
      const originalNeeds = [...mergeNode.needs];
      mergeNode.needs = mergeNode.needs.filter(id => !needsToRemove.has(id));
      console.log(`[breakDiamondPatternCycles] After filtering: [${mergeNode.needs.join(', ')}]`);
      if (needsToRemove.size > 0) {
        console.log(`[breakDiamondPatternCycles] Removed ${needsToRemove.size} indirect dependencies`);
      }
    }
  }

  /**
   * Break cycles where a source node feeds both an intermediate node and a merge,
   * and the intermediate node also feeds the merge
   * Example: GetFields → GET UNIPILE ACCOUNT → Merge, GetFields → Merge
   * The cycle: GET UNIPILE ACCOUNT → GetFields → Merge → GET UNIPILE ACCOUNT
   * Solution: Remove GetFields from GET UNIPILE ACCOUNT's needs because Merge already depends on GetFields
   */
  private breakDiamondPatternCyclesAtSource(
    nodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): void {
    // Find all merge nodes
    const mergeNodes = nodes.filter(node => {
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === node.nodeId;
      });
      return n8nNode?.type === 'n8n-nodes-base.merge';
    });

    if (mergeNodes.length === 0) return;

    for (const mergeNode of mergeNodes) {
      const n8nMergeNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === mergeNode.nodeId;
      });
      if (!n8nMergeNode) continue;

      // Find all nodes that connect directly to this merge
      const mergeDirectInputs = new Set<string>();
      for (const [sourceNodeName, connectionArray] of Object.entries(n8nWorkflow.connections)) {
        if (Array.isArray(connectionArray)) {
          for (const conn of connectionArray) {
            if (conn?.node === n8nMergeNode.name && conn.type === 'main') {
              const sourceN8nNode = n8nWorkflow.nodes.find(n => n.name === sourceNodeName);
              if (sourceN8nNode) {
                const sourceLamaticId = nodeIdMap.get(sourceN8nNode.id);
                if (sourceLamaticId) {
                  mergeDirectInputs.add(sourceLamaticId);
                }
              }
            }
          }
        }
      }

      // For each node that feeds the merge, check if it also feeds other nodes that feed the merge
      // If so, remove the dependency from those intermediate nodes to the source
      for (const mergeInputId of Array.from(mergeDirectInputs)) {
        const mergeInputNode = nodes.find(n => n.nodeId === mergeInputId);
        if (!mergeInputNode) continue;

        const mergeInputN8nNode = n8nWorkflow.nodes.find(n => {
          const mappedId = nodeIdMap.get(n.id);
          return mappedId === mergeInputId;
        });
        if (!mergeInputN8nNode) continue;

        // Check what nodes this merge input connects to
        const connections = n8nWorkflow.connections[mergeInputN8nNode.name];
        if (connections && Array.isArray(connections)) {
          for (const conn of connections) {
            if (!conn || !conn.node || conn.type !== 'main') continue;
            
            const targetN8nNode = n8nWorkflow.nodes.find(n => n.name === conn.node);
            if (!targetN8nNode) continue;
            
            // If target is the merge, skip (we're already handling merge inputs)
            if (targetN8nNode.id === n8nMergeNode.id) continue;
            
            // Check if target also connects to merge
            const targetConnections = n8nWorkflow.connections[targetN8nNode.name];
            const targetConnectsToMerge = targetConnections && Array.isArray(targetConnections) &&
              targetConnections.some((c: any) => c?.node === n8nMergeNode.name);
            
            if (targetConnectsToMerge) {
              // We have: mergeInput → target → merge, and mergeInput → merge
              // This is a diamond pattern. The target node shouldn't depend on mergeInput
              // because merge already depends on mergeInput directly
              const targetLamaticId = nodeIdMap.get(targetN8nNode.id);
              if (targetLamaticId) {
                const targetNode = nodes.find(n => n.nodeId === targetLamaticId);
                if (targetNode && targetNode.needs.includes(mergeInputId)) {
                  console.log(`[breakDiamondPatternCyclesAtSource] Removing dependency: ${targetNode.nodeName} removing ${mergeInputNode.nodeName} (diamond pattern: ${mergeInputNode.nodeName} → ${targetNode.nodeName} → Merge, and ${mergeInputNode.nodeName} → Merge directly)`);
                  targetNode.needs = targetNode.needs.filter(id => id !== mergeInputId);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Break cycles that go through merge nodes
   * If there's a cycle: A → ... → Merge → B → ... → A, and Merge depends on A,
   * we need to break it by removing Merge's dependency on A (since A is reachable from Merge)
   */
  private breakMergeNodeCyclesInPaths(
    nodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>
  ): void {
    // Find all merge nodes
    const mergeNodes = nodes.filter(node => {
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === node.nodeId;
      });
      return n8nNode?.type === 'n8n-nodes-base.merge';
    });

    if (mergeNodes.length === 0) return;

    for (const mergeNode of mergeNodes) {
      const n8nMergeNode = n8nWorkflow.nodes.find(n => {
        const mappedId = nodeIdMap.get(n.id);
        return mappedId === mergeNode.nodeId;
      });
      if (!n8nMergeNode) continue;

      // For each node that Merge depends on, check if that node is reachable from Merge
      // If so, we have a cycle and should remove the dependency
      const needsToRemove = new Set<string>();
      for (const needId of mergeNode.needs) {
        const needNode = nodes.find(n => n.nodeId === needId);
        if (!needNode) continue;

        const needN8nNode = n8nWorkflow.nodes.find(n => {
          const mappedId = nodeIdMap.get(n.id);
          return mappedId === needId;
        });
        if (!needN8nNode) continue;

        // Check if need is reachable from merge (through forward connections)
        if (this.isReachableThroughMain(n8nMergeNode.name, needN8nNode.name, n8nWorkflow, nodeIdMap, new Set())) {
          console.log(`[breakMergeNodeCyclesInPaths] Removing dependency: ${mergeNode.nodeName} removing ${needNode.nodeName} (cycle detected: ${mergeNode.nodeName} → ... → ${needNode.nodeName})`);
          needsToRemove.add(needId);
        }
      }

      mergeNode.needs = mergeNode.needs.filter(id => !needsToRemove.has(id));
    }
  }

  /**
   * Attempt to break a cycle automatically based on error message
   * Returns true if cycle was broken, false otherwise
   */
  private attemptBreakCycle(nodes: LamaticNode[], errorMessage: string): boolean {
    // Extract cycle path from error message
    // Format: "Circular dependency detected: A -> B -> C -> A"
    const cycleMatch = errorMessage.match(/Circular dependency detected: (.+)/);
    if (!cycleMatch) return false;

    const cyclePath = cycleMatch[1].split(' -> ').map(s => s.trim());
    if (cyclePath.length < 2) return false;

    // Find the nodes in the cycle
    const cycleNodes = cyclePath.map(nodeName => {
      return nodes.find(n => n.nodeName === nodeName);
    }).filter(n => n !== undefined) as LamaticNode[];

    if (cycleNodes.length < 2) return false;

    // Strategy: Remove the dependency from the LAST node in the cycle to the FIRST
    // This breaks the cycle while preserving as many dependencies as possible
    const lastNode = cycleNodes[cycleNodes.length - 1];
    const firstNode = cycleNodes[0];
    
    if (lastNode && firstNode && lastNode.needs.includes(firstNode.nodeId)) {
      console.log(`[attemptBreakCycle] Breaking cycle by removing dependency: ${lastNode.nodeName} removing ${firstNode.nodeName}`);
      lastNode.needs = lastNode.needs.filter(id => id !== firstNode.nodeId);
      return true;
    }

    return false;
  }

  /**
   * Check if targetNodeName is reachable from sourceNodeName through main connections only
   */
  private isReachableThroughMain(
    sourceNodeName: string,
    targetNodeName: string,
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>,
    visited: Set<string>
  ): boolean {
    if (visited.has(sourceNodeName)) return false;
    if (sourceNodeName === targetNodeName) return true;
    visited.add(sourceNodeName);

    const connections = n8nWorkflow.connections[sourceNodeName];
    if (connections && Array.isArray(connections)) {
      for (const conn of connections) {
        if (!conn || !conn.node) continue;
        if (conn.type !== 'main') continue;
        
        if (conn.node === targetNodeName) {
          return true;
        }
        if (this.isReachableThroughMain(conn.node, targetNodeName, n8nWorkflow, nodeIdMap, visited)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Recursively find all nodes that come AFTER a splitInBatches node in the flow
   * This follows forward connections from the splitInBatches node to find all downstream nodes
   */
  private findNodesAfterSplitInBatches(
    currentNodeName: string,
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>,
    result: Set<string>,
    visited: Set<string>
  ): void {
    if (visited.has(currentNodeName)) return;
    visited.add(currentNodeName);

    const currentNode = n8nWorkflow.nodes.find(n => n.name === currentNodeName);
    if (!currentNode) return;

    // Find all nodes this node connects to (forward connections)
    const connections = n8nWorkflow.connections[currentNodeName];
    if (connections && Array.isArray(connections)) {
      for (const conn of connections) {
        if (!conn || !conn.node) continue;
        
        // Skip if we've already processed this node (avoid infinite loops)
        if (visited.has(conn.node)) continue;

        // Only follow 'main' connections (data flow), skip ai_languageModel, ai_tool, etc.
        const connectionType = conn.type || 'main';
        if (connectionType === 'main') {
          // For splitInBatches nodes, only follow output index 1 (items), not output 0 (done)
          // But we're already past the splitInBatches node, so follow all connections
          // Find the lamatic ID for the target node
          const targetN8nNode = n8nWorkflow.nodes.find(n => n.name === conn.node);
          if (targetN8nNode) {
            const targetLamaticId = nodeIdMap.get(targetN8nNode.id);
            if (targetLamaticId) {
              result.add(targetLamaticId);
              // Recursively find nodes after this one
              this.findNodesAfterSplitInBatches(
                conn.node,
                n8nWorkflow,
                nodeIdMap,
                result,
                visited
              );
            }
          }
        }
      }
    }
  }

  /**
   * Validate dependencies for circular references
   */
  validateDependencies(
    nodes: LamaticNode[],
    connections: Record<string, LamaticConnection>
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check for circular dependencies
      const nodeInputs = new Map<string, string[]>();
      for (const node of nodes) {
        nodeInputs.set(node.nodeId, node.needs);
      }
      
      this.calculateExecutionOrder(nodes, nodeInputs);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates that connections are consistent with needs arrays
   * Ensures all dependencies are properly reflected in connections object
   * CRITICAL: Special handling for branch nodes to ensure all outputs are connected
   */
  private validateConnectionsConsistency(
    nodes: LamaticNode[],
    connections: Record<string, LamaticConnection>,
    warnings: string[]
  ): void {
    const allNodeIds = new Set(nodes.map(node => node.nodeId));
    const nodeMap = new Map(nodes.map(node => [node.nodeId, node]));
    
    // Build reverse map: for each node, which nodes depend on it (from needs arrays)
    const reverseDependencies = new Map<string, Set<string>>();
    for (const node of nodes) {
      for (const depId of node.needs || []) {
        if (!reverseDependencies.has(depId)) {
          reverseDependencies.set(depId, new Set());
        }
        reverseDependencies.get(depId)!.add(node.nodeId);
      }
    }
    
    // Check that all nodes with dependencies have connections defined
    for (const [sourceNodeId, dependentNodeIds] of Array.from(reverseDependencies.entries())) {
      const sourceConnection = connections[sourceNodeId];
      if (!sourceConnection || !sourceConnection.connections) {
        warnings.push(`Node '${sourceNodeId}' has dependencies but no connections object defined`);
        continue;
      }
      
      const sourceNode = nodeMap.get(sourceNodeId);
      const isBranchNode = sourceNode?.nodeType === 'branchNode';
      
      // Check that all dependent nodes are in the connections
      const connectedNodeIds = new Set<string>();
      const connectionsByOutputIndex = new Map<number, Set<string>>();
      
      for (const [portType, portConnections] of Object.entries(sourceConnection.connections)) {
        if (Array.isArray(portConnections)) {
          // For branch nodes, track connections by outputIndex
          portConnections.forEach((outputConnections, outputIndex) => {
            if (Array.isArray(outputConnections)) {
              if (!connectionsByOutputIndex.has(outputIndex)) {
                connectionsByOutputIndex.set(outputIndex, new Set());
              }
              for (const connDetail of outputConnections) {
                if (connDetail && connDetail.nodeId) {
                  connectedNodeIds.add(connDetail.nodeId);
                  connectionsByOutputIndex.get(outputIndex)!.add(connDetail.nodeId);
                }
              }
            }
          });
        }
      }
      
      // CRITICAL: For branch nodes, validate that all outputs have connections
      if (isBranchNode) {
        const branchValues = sourceNode?.values;
        const expectedBranches = branchValues?.branches || [];
        const expectedOutputCount = expectedBranches.length;
        const actualOutputCount = connectionsByOutputIndex.size;
        
        // Get the actual connections from the connections object
        const mainConnections = sourceConnection.connections?.main;
        const actualConnectionsCount = Array.isArray(mainConnections) ? mainConnections.length : 0;
        
        if (actualOutputCount < expectedOutputCount) {
          warnings.push(`Branch node '${sourceNodeId}' has ${expectedOutputCount} expected outputs but only ${actualOutputCount} outputs have connections`);
        }
        
        if (actualConnectionsCount < expectedOutputCount) {
          warnings.push(`Branch node '${sourceNodeId}' connections array has ${actualConnectionsCount} elements but ${expectedOutputCount} expected (branches: ${expectedBranches.map((b: any) => b.label).join(', ')})`);
        }
        
        // Check that each expected branch has at least one connection
        for (let i = 0; i < expectedOutputCount; i++) {
          const branchLabel = expectedBranches[i]?.label || `Output ${i}`;
          if (!connectionsByOutputIndex.has(i)) {
            warnings.push(`Branch node '${sourceNodeId}' output index ${i} (${branchLabel}) has no connections in needs array`);
          }
          // Also check the actual connections array
          if (Array.isArray(mainConnections) && (!mainConnections[i] || !Array.isArray(mainConnections[i]) || mainConnections[i].length === 0)) {
            warnings.push(`Branch node '${sourceNodeId}' output index ${i} (${branchLabel}) has no connections in connections.main[${i}]`);
          }
        }
      }
      
      // Check for missing connections (nodes in needs but not in connections)
      for (const dependentId of Array.from(dependentNodeIds)) {
        if (!connectedNodeIds.has(dependentId)) {
          warnings.push(`Missing connection: '${sourceNodeId}' should connect to '${dependentId}' (found in needs array but not in connections)`);
        }
      }
    }
    
    // Check for orphaned nodes (nodes in connections but not in nodes list)
    const referencedNodeIds = new Set<string>();
    for (const connection of Object.values(connections)) {
      for (const portConnections of Object.values(connection.connections)) {
        for (const outputConnections of portConnections) {
          if (Array.isArray(outputConnections)) {
            for (const connDetail of outputConnections) {
              if (connDetail && connDetail.nodeId) {
                referencedNodeIds.add(connDetail.nodeId);
              }
            }
          }
        }
      }
    }
    
    for (const node of nodes) {
      for (const dep of node.needs) {
        referencedNodeIds.add(dep);
      }
    }
    
    const orphanedNodes = nodes.filter(node => 
      !referencedNodeIds.has(node.nodeId) && node.needs.length === 0
    );
    
    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} orphaned nodes found (no incoming or outgoing connections)`);
    }
  }

  /**
   * Builds top-level 'condition' array for conditionNode nodes
   * CRITICAL: Lamatic conditionNode uses a top-level condition array that maps branch labels to target nodeIds
   * This replaces the connections object for condition nodes
   */
  private buildConditionArrays(
    lamaticNodes: LamaticNode[],
    n8nWorkflow: N8nWorkflow,
    nodeIdMap: Map<string, string>,
    n8nNodeNameToId: Map<string, string>,
    n8nNodeIdToLamaticId: Map<string, string>
  ): void {
    // Find all conditionNode nodes
    const conditionNodes = lamaticNodes.filter(node => node.nodeType === 'conditionNode');
    
    for (const conditionNode of conditionNodes) {
      // Find the corresponding n8n node
      const n8nNode = n8nWorkflow.nodes.find(n => {
        const lamaticId = nodeIdMap.get(n.id);
        return lamaticId === conditionNode.nodeId;
      });
      
      if (!n8nNode) continue;
      
      // Get branches from metadata (stored during node creation)
      const branches = conditionNode._flowMetadata?.branches || [];
      if (branches.length === 0) continue;
      
      // Get connections from n8n workflow for this node
      // n8n connections format: { "main": [[conn1], [conn2]] } where array index is outputIndex
      const n8nConnections: any = n8nWorkflow.connections[n8nNode.name];
      if (!n8nConnections) continue;
      
      // Build condition array: map each branch to its target nodeId
      const conditionArray: Array<{label: string; value: string}> = [];
      
      // Group connections by outputIndex
      const connectionsByOutputIndex = new Map<number, string[]>();
      
      // Handle both normalized format (array) and original format (object with main/ai_memory)
      let connectionList: any[] = [];
      if (Array.isArray(n8nConnections)) {
        // Normalized format: flat array with outputIndex property
        connectionList = n8nConnections;
      } else if (n8nConnections && typeof n8nConnections === 'object' && n8nConnections.main && Array.isArray(n8nConnections.main)) {
        // Original format: { main: [[conn1], [conn2]] } - array index is outputIndex
        n8nConnections.main.forEach((portConnections: any[], outputIndex: number) => {
          if (Array.isArray(portConnections)) {
            portConnections.forEach((conn: any) => {
              if (conn && conn.node) {
                connectionList.push({
                  ...conn,
                  outputIndex: outputIndex // Use array index as outputIndex
                });
              }
            });
          }
        });
      }
      
      // Process connections and group by outputIndex
      for (const conn of connectionList) {
        if (!conn || !conn.node) continue;
        const outputIndex = conn.outputIndex !== undefined ? conn.outputIndex : (typeof conn.index === 'number' ? conn.index : 0);
        
        // Find target node
        const targetN8nNode = n8nWorkflow.nodes.find(n => n.name === conn.node);
        if (!targetN8nNode) continue;
        
        const targetLamaticId = n8nNodeIdToLamaticId.get(targetN8nNode.id);
        if (!targetLamaticId) continue;
        
        if (!connectionsByOutputIndex.has(outputIndex)) {
          connectionsByOutputIndex.set(outputIndex, []);
        }
        connectionsByOutputIndex.get(outputIndex)!.push(targetLamaticId);
      }
      
      // Build condition array matching branches to target nodeIds
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        const outputIndex = parseInt(branch.value, 10);
        const targetNodeIds = connectionsByOutputIndex.get(outputIndex) || [];
        
        // Use first target nodeId (Lamatic condition array uses single nodeId per branch)
        const targetNodeId = targetNodeIds.length > 0 ? targetNodeIds[0] : null;
        
        if (targetNodeId) {
          conditionArray.push({
            label: branch.label,
            value: targetNodeId // CRITICAL: value is the target nodeId, not the branch index
          });
        }
      }
      
      // Add top-level condition array to the node
      if (conditionArray.length > 0) {
        (conditionNode as any).condition = conditionArray;
      }
    }
  }
}
