/**
 * Type definitions for n8n to Lamatic migration.
 * 
 * Defines the structure of n8n workflows, Lamatic workflows, and migration
 * result types used throughout the migration pipeline.
 */

/**
 * n8n workflow structure as exported from n8n.
 * Represents the source format that will be converted to Lamatic.
 */
export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, N8nConnection[]>;
  active: boolean;
  settings?: Record<string, any>;
  versionId?: string;
  meta?: Record<string, any>;
  id?: string;
  tags?: string[];
}

/**
 * n8n node structure representing a single workflow node.
 * Each node has a type, parameters, position, and optional webhook ID.
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  webhookId?: string;
}

/**
 * n8n connection structure representing a connection between nodes.
 * 
 * @property node - Target node name (not ID, as n8n uses names in connections)
 * @property type - Connection type: 'main', 'ai_memory', 'ai_languageModel', 'ai_tool', etc.
 * @property index - Input index on target node
 * @property outputIndex - Output branch index for switch/if nodes (0=first branch, 1=second, etc.)
 */
export interface N8nConnection {
  node: string;
  type: string;
  index: number;
  outputIndex?: number;
}

/**
 * Lamatic workflow structure - the target format for migration.
 * 
 * Contains trigger node, regular nodes, connections, and runtime metadata.
 */
export interface LamaticWorkflow {
  name: string;
  description?: string;
  triggerNode: LamaticNode;
  nodes: LamaticNode[];
  connections: Record<string, LamaticConnection>;
  'x-runtime'?: Record<string, any>;
  '_flowMetadata'?: Record<string, any>;
}

/**
 * Lamatic node structure representing a single workflow node in Lamatic format.
 * 
 * @property nodeId - Unique identifier for the node
 * @property nodeType - Type of node (e.g., 'webhookTriggerNode', 'LLMNode', 'agentNode')
 * @property nodeName - Human-readable node name
 * @property values - Node configuration values (type-specific)
 * @property modes - Node execution modes
 * @property needs - Array of node IDs this node depends on (execution order)
 */
export interface LamaticNode {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  values: Record<string, any>;
  modes: Record<string, any>;
  needs: string[];
  'x-runtime'?: Record<string, any>;
  '_flowMetadata'?: Record<string, any>;
}

/**
 * Lamatic connection structure organizing connections by port type.
 * 
 * Connections are grouped by port type (main, ai_memory, etc.) and organized
 * as nested arrays: portType -> [output0[], output1[], ...]
 */
export interface LamaticConnection {
  flowType: string;
  executionOrder: number;
  connections: Record<string, LamaticConnectionDetail[][]>;
}

export interface LamaticConnectionDetail {
  nodeId: string;
  type: string;
  index: number;
  outputIndex?: number;
  flowContext?: string;
}

/**
 * Result of a migration operation containing success status, statistics, and the converted workflow.
 */
export interface MigrationResult {
  success: boolean;
  totalNodes: number;
  convertedNodes: number;
  warningNodes: number;
  errorNodes: number;
  skippedNodes: number;
  nodeResults: NodeMigrationResult[];
  lamaticWorkflow?: LamaticWorkflow;
  migrationLog: string[];
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export interface NodeMigrationResult {
  n8nNodeId: string;
  n8nNodeName: string;
  n8nNodeType: string;
  status: 'success' | 'warning' | 'error' | 'skipped';
  lamaticNodeId: string;
  lamaticNodeName: string;
  lamaticNodeType: string;
  message: string;
  warnings: string[];
  errors: string[];
  requiresManualSetup: boolean;
  requiresReauth: boolean;
}

/**
 * Progress information for a migration operation.
 * Used for real-time progress tracking during migration.
 */
export interface MigrationProgress {
  currentStep: MigrationStep;
  progress: number;
  message: string;
  startTime: number;
}

export type MigrationStep = 
  | 'parse'
  | 'map'
  | 'dependencies'
  | 'validate'
  | 'generate'
  | 'complete'
  | 'error';

/**
 * Mapping definition for converting an n8n node type to a Lamatic node type.
 * 
 * Defines parameter mappings, credential mappings, and support status.
 */
export interface NodeMapping {
  n8nType: string;
  lamaticType: string;
  isSupported: boolean;
  parameterMappings: ParameterMapping[];
  credentialMappings: CredentialMapping[];
  notes?: string;
  requiresManualSetup?: boolean;
}

export interface ParameterMapping {
  n8nParameter: string;
  lamaticParameter: string;
  required: boolean;
  defaultValue?: any;
  transform?: (value: any) => any;
}

export interface CredentialMapping {
  n8nCredential: string;
  lamaticCredential: string;
  requiresReauth: boolean;
}
