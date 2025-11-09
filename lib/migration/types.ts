/**
 * Type definitions for n8n to Lamatic migration
 */

// n8n workflow structure
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

// n8n node structure
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  webhookId?: string;
}

// n8n connection structure
export interface N8nConnection {
  node: string;
  type: string;
  index: number;
  outputIndex?: number; // For switch/if nodes: which output branch (0, 1, 2, etc.)
}

// Lamatic workflow structure
export interface LamaticWorkflow {
  name: string;
  description?: string;
  triggerNode: LamaticNode;
  nodes: LamaticNode[];
  connections: Record<string, LamaticConnection>;
  'x-runtime'?: Record<string, any>;
  '_flowMetadata'?: Record<string, any>;
}

// Lamatic node structure
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

// Lamatic connection structure
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

// Migration result types
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

// Migration progress types
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

// Node mapping types
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
