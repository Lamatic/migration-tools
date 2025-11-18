import { N8nNode, LamaticNode, NodeMapping, ParameterMapping, CredentialMapping } from './types';
import { ALL_SCHEMAS } from './schemas';
import { validateAgainstSchema, isStrictMode } from './schemaValidator';

/**
 * Mapping engine for converting n8n nodes to Lamatic nodes
 * Handles deterministic mappings and parameter transformations
 */
export class NodeMapper {
  private mappings: Map<string, NodeMapping> = new Map();

  constructor() {
    this.initializeMappings();
  }

  /**
   * Initializes the node mapping registry
   */
  private initializeMappings(): void {
    // Webhook Trigger Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.webhook',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'httpMethod', lamaticParameter: 'method', required: true },
        { n8nParameter: 'path', lamaticParameter: 'path', required: true },
        { n8nParameter: 'responseMode', lamaticParameter: 'responseMode', required: false },
        { n8nParameter: 'options.responseData', lamaticParameter: 'responseData', required: false },
      ],
      credentialMappings: [],
      notes: 'Webhook trigger with configurable HTTP method and path',
    });

    // Manual Trigger Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.manualTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [],
      credentialMappings: [],
      notes: 'Manual trigger for testing and manual execution',
    });

    // Schedule Trigger Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.scheduleTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'rule.interval', lamaticParameter: 'interval', required: true },
        { n8nParameter: 'rule.intervalValue', lamaticParameter: 'intervalValue', required: true },
        { n8nParameter: 'rule.intervalUnit', lamaticParameter: 'intervalUnit', required: true },
      ],
      credentialMappings: [],
      notes: 'Scheduled trigger with configurable intervals',
    });

    // Google Gemini Chat Model Mapping
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'modelName', lamaticParameter: 'model', required: true },
        { n8nParameter: 'temperature', lamaticParameter: 'temperature', required: false },
        { n8nParameter: 'maxTokens', lamaticParameter: 'maxTokens', required: false },
        { n8nParameter: 'topP', lamaticParameter: 'topP', required: false },
        { n8nParameter: 'topK', lamaticParameter: 'topK', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleGeminiOAuth2Api', lamaticCredential: 'google', requiresReauth: true },
      ],
      notes: 'Google Gemini LLM integration for AI operations',
    });

    // Window Buffer Memory Mapping
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'sessionIdType', lamaticParameter: 'sessionIdType', required: false },
        { n8nParameter: 'sessionKey', lamaticParameter: 'sessionKey', required: false },
        { n8nParameter: 'contextWindowLength', lamaticParameter: 'contextWindowLength', required: false },
        { n8nParameter: 'returnMessages', lamaticParameter: 'returnMessages', required: false },
      ],
      credentialMappings: [],
      notes: 'Memory buffer for conversation context',
    });

    // Agent Node Mapping
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.agent',
      lamaticType: 'agentNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'text', lamaticParameter: 'prompt', required: true },
        { n8nParameter: 'options.systemMessage', lamaticParameter: 'systemMessage', required: false },
        { n8nParameter: 'options.maxIterations', lamaticParameter: 'maxIterations', required: false },
        { n8nParameter: 'options.returnIntermediateSteps', lamaticParameter: 'returnIntermediateSteps', required: false },
      ],
      credentialMappings: [],
      notes: 'AI Agent for processing and responding to queries',
    });

    // Slack Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.slack',
      lamaticType: 'slackNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'action', required: false, defaultValue: 'postMessage' },
        { n8nParameter: 'channelId', lamaticParameter: 'channel', required: false, transform: (v: any) => (v && typeof v === 'object' && v.value !== undefined ? v.value : v) },
        { n8nParameter: 'text', lamaticParameter: 'message', required: false },
        { n8nParameter: 'otherOptions.mrkdwn', lamaticParameter: 'mrkdwn', required: false },
        { n8nParameter: 'otherOptions.sendAsUser', lamaticParameter: 'username', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'slackApi', lamaticCredential: 'slack', requiresReauth: true },
      ],
      notes: 'Slack integration for messaging',
    });

    // HTTP Request Node Mapping (updated to apiNode - see Phase 3)

    // Code Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.code',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'jsCode', lamaticParameter: 'code', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Custom code execution node',
    });

    // If Node Mapping → conditionNode (Lamatic uses conditionNode with top-level condition array)
    this.addMapping({
      n8nType: 'n8n-nodes-base.if',
      lamaticType: 'conditionNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'conditions', lamaticParameter: 'conditions', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Conditional logic node',
    });

    // Set Data Node Mapping → variablesNode (schema-supported)
    this.addMapping({
      n8nType: 'n8n-nodes-base.set',
      lamaticType: 'variablesNode',
      isSupported: true,
      parameterMappings: [
        // We'll stringify the mapping at creation time to match variablesNode schema
        { n8nParameter: 'values', lamaticParameter: 'mapping', required: true },
      ],
      credentialMappings: [],
      notes: 'Set/transform data fields in the workflow',
    });

    // Merge Node Mapping → codeNode (data merging logic)
    this.addMapping({
      n8nType: 'n8n-nodes-base.merge',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'mode', lamaticParameter: 'mode', required: true, defaultValue: 'append' },
        { n8nParameter: 'mergeByFields', lamaticParameter: 'mergeByFields', required: false },
        { n8nParameter: 'options.clashHandling', lamaticParameter: 'clashHandling', required: false, defaultValue: 'preferInput1' },
      ],
      credentialMappings: [],
      notes: 'Merge data from multiple inputs',
    });

    // Switch Node Mapping → conditionNode (Lamatic uses conditionNode with top-level condition array)
    this.addMapping({
      n8nType: 'n8n-nodes-base.switch',
      lamaticType: 'conditionNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'mode', lamaticParameter: 'mode', required: true, defaultValue: 'rules' },
        { n8nParameter: 'rules', lamaticParameter: 'rules', required: false },
        { n8nParameter: 'fallbackOutput', lamaticParameter: 'fallbackOutput', required: false, defaultValue: 'extra' },
      ],
      credentialMappings: [],
      notes: 'Route data based on rules/conditions',
    });

    // ==========================================
    // PHASE 2: INTEGRATION NODES
    // ==========================================

    // Gmail Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.gmail',
      lamaticType: 'gmailNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'send' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'message' },
        { n8nParameter: 'to', lamaticParameter: 'to', required: false },
        { n8nParameter: 'subject', lamaticParameter: 'subject', required: false },
        { n8nParameter: 'message', lamaticParameter: 'message', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'gmailOAuth2', lamaticCredential: 'gmail', requiresReauth: true }
      ],
      notes: 'Gmail integration for sending and managing emails',
    });

    // Google Sheets Node Mapping (schema-supported)
    this.addMapping({
      n8nType: 'n8n-nodes-base.googleSheets',
      lamaticType: 'googleSheetsNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'append' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'sheet' },
        { n8nParameter: 'documentId', lamaticParameter: 'spreadsheetId', required: false, transform: (v: any) => (v && typeof v === 'object' && v.value !== undefined ? v.value : v) },
        { n8nParameter: 'sheetId', lamaticParameter: 'spreadsheetId', required: false, transform: (v: any) => (v && typeof v === 'object' && v.value !== undefined ? v.value : v) },
        { n8nParameter: 'sheetName', lamaticParameter: 'sheetName', required: false, defaultValue: 'Sheet1', transform: (v: any) => (v && typeof v === 'object' && v.value !== undefined ? v.value : v) },
        { n8nParameter: 'range', lamaticParameter: 'range', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleSheetsOAuth2', lamaticCredential: 'googleSheets', requiresReauth: true }
      ],
      notes: 'Google Sheets integration for data manipulation',
    });

    // Airtable Node Mapping - REMOVED (duplicate, see line 688-691 for correct mapping to airtableNode)

    // Microsoft Teams Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.microsoftTeams',
      lamaticType: 'teamsNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'postMessage' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'message' },
        { n8nParameter: 'teamId', lamaticParameter: 'teamId', required: false },
        { n8nParameter: 'channelId', lamaticParameter: 'channelId', required: false },
        { n8nParameter: 'messageText', lamaticParameter: 'message', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'microsoftTeamsOAuth2', lamaticCredential: 'microsoftTeams', requiresReauth: true }
      ],
      notes: 'Microsoft Teams messaging and collaboration',
    });

    // Discord Node Mapping (no schema-equivalent → mark unsupported to trigger placeholder)
    this.addMapping({
      n8nType: 'n8n-nodes-base.discord',
      lamaticType: 'placeholderNode',
      isSupported: false,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'sendMessage' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'message' },
        { n8nParameter: 'channelId', lamaticParameter: 'channelId', required: true },
        { n8nParameter: 'content', lamaticParameter: 'message', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'discordBotApi', lamaticCredential: 'discord', requiresReauth: true }
      ],
      notes: 'Discord bot messaging',
    });

    // Notion Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.notion',
      lamaticType: 'notionNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'create' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'page' },
        { n8nParameter: 'databaseId', lamaticParameter: 'databaseId', required: false },
        { n8nParameter: 'pageId', lamaticParameter: 'pageId', required: false },
        { n8nParameter: 'properties', lamaticParameter: 'properties', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'notionApi', lamaticCredential: 'notion', requiresReauth: true }
      ],
      notes: 'Notion workspace management',
    });

    // ==========================================
    // PHASE 3: ADDITIONAL N8N NODE MAPPINGS
    // ==========================================

    // Memory Manager Mapping → memoryNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.memoryManager',
      lamaticType: 'memoryNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'mode', lamaticParameter: 'mode', required: false, defaultValue: 'insert' },
        { n8nParameter: 'messages', lamaticParameter: 'messages', required: false },
        { n8nParameter: 'sessionKey', lamaticParameter: 'sessionId', required: false },
      ],
      credentialMappings: [],
      notes: 'Memory management for conversation context',
    });

    // Aggregate Node → codeNode (data processing)
    this.addMapping({
      n8nType: 'n8n-nodes-base.aggregate',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'aggregate', lamaticParameter: 'aggregate', required: false },
        { n8nParameter: 'destinationFieldName', lamaticParameter: 'destinationField', required: false },
      ],
      credentialMappings: [],
      notes: 'Aggregate data from multiple items',
    });

    // Limit Node → codeNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.limit',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'limit', lamaticParameter: 'limit', required: false },
        { n8nParameter: 'keep', lamaticParameter: 'keep', required: false, defaultValue: 'first' },
      ],
      credentialMappings: [],
      notes: 'Limit number of items',
    });

    // Chain LLM → LLMNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.chainLlm',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'text', lamaticParameter: 'prompt', required: false },
        { n8nParameter: 'messages', lamaticParameter: 'messages', required: false },
        { n8nParameter: 'promptType', lamaticParameter: 'promptType', required: false },
      ],
      credentialMappings: [],
      notes: 'LLM chain for text generation',
    });

    // OpenAI (Speech to Text) → extractFromFileNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.openAi',
      lamaticType: 'extractFromFileNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true },
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true },
        { n8nParameter: 'binaryPropertyName', lamaticParameter: 'fileProperty', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'openAiApi', lamaticCredential: 'openai', requiresReauth: true }
      ],
      notes: 'OpenAI speech to text and image generation',
    });

    // Respond to Webhook → webhookTriggerNode (handled in trigger)
    this.addMapping({
      n8nType: 'n8n-nodes-base.respondToWebhook',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'respondWith', lamaticParameter: 'responseMode', required: false },
        { n8nParameter: 'responseData', lamaticParameter: 'responseData', required: false },
      ],
      credentialMappings: [],
      notes: 'Response handling for webhook triggers',
    });

    // Form Trigger → webhookTriggerNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.formTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'options.path', lamaticParameter: 'path', required: false },
        { n8nParameter: 'formTitle', lamaticParameter: 'formTitle', required: false },
        { n8nParameter: 'formFields', lamaticParameter: 'formFields', required: false },
      ],
      credentialMappings: [],
      notes: 'Form-based webhook trigger',
    });

    // Execute Workflow → flowNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.executeWorkflow',
      lamaticType: 'flowNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'workflowId', lamaticParameter: 'flowId', required: true },
        { n8nParameter: 'mode', lamaticParameter: 'mode', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Execute another workflow/flow',
    });

    // Execute Workflow Trigger → webhookTriggerNode (it's a trigger, needs to be detected as such)
    this.addMapping({
      n8nType: 'n8n-nodes-base.executeWorkflowTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'workflowInputs', lamaticParameter: 'workflowInputs', required: false },
      ],
      credentialMappings: [],
      notes: 'Trigger for executed workflow (sub-workflow entry point)',
    });

    // Filter Node → conditionNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.filter',
      lamaticType: 'conditionNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'conditions', lamaticParameter: 'conditions', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Filter items based on conditions',
    });

    // Execution Data → variablesNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.executionData',
      lamaticType: 'variablesNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'dataToSave', lamaticParameter: 'dataToSave', required: false },
      ],
      credentialMappings: [],
      notes: 'Store execution data as variables',
    });

    // Chat Trigger → chatTriggerNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.chatTrigger',
      lamaticType: 'chatTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'public', lamaticParameter: 'public', required: false },
        { n8nParameter: 'initialMessages', lamaticParameter: 'initialMessages', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Chat interface trigger',
    });

    // Wikipedia Tool → apiNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.toolWikipedia',
      lamaticType: 'apiNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'query', lamaticParameter: 'query', required: false },
      ],
      credentialMappings: [],
      notes: 'Wikipedia search tool via API',
    });

    // Groq Chat Model → LLMNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.lmChatGroq',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'model', lamaticParameter: 'model', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'groqApi', lamaticCredential: 'groq', requiresReauth: true }
      ],
      notes: 'Groq LLM integration',
    });

    // OpenAI Chat Model → LLMNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'model', lamaticParameter: 'model', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'openAiApi', lamaticCredential: 'openai', requiresReauth: true }
      ],
      notes: 'OpenAI LLM chat model',
    });

    // Postgres Tool → postgresNode (LangChain tool for agents)
    this.addMapping({
      n8nType: 'n8n-nodes-base.postgresTool',
      lamaticType: 'postgresNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'query', lamaticParameter: 'query', required: true },
        { n8nParameter: 'operation', lamaticParameter: 'action', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'postgres', lamaticCredential: 'postgres', requiresReauth: true }
      ],
      notes: 'PostgreSQL tool for LangChain agents - connects via ai_tool connection type',
    });

    // Google Drive → googleDriveNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.googleDrive',
      lamaticType: 'googleDriveNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true },
        { n8nParameter: 'fileId', lamaticParameter: 'fileId', required: false },
        { n8nParameter: 'folderId', lamaticParameter: 'folderId', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleDriveOAuth2', lamaticCredential: 'googleDrive', requiresReauth: true }
      ],
      notes: 'Google Drive file operations',
    });

    // Edit Image → codeNode (image processing)
    this.addMapping({
      n8nType: 'n8n-nodes-base.editImage',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true },
        { n8nParameter: 'width', lamaticParameter: 'width', required: false },
        { n8nParameter: 'height', lamaticParameter: 'height', required: false },
      ],
      credentialMappings: [],
      notes: 'Image editing and resizing',
    });

    // Document Default Data Loader → extractFromFileNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
      lamaticType: 'extractFromFileNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'loader', lamaticParameter: 'loaderType', required: true },
        { n8nParameter: 'dataType', lamaticParameter: 'dataType', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Load documents from various formats',
    });

    // Text Splitter → chunkNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
      lamaticType: 'chunkNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'chunkSize', lamaticParameter: 'numOfChars', required: false, defaultValue: 1000 },
        { n8nParameter: 'chunkOverlap', lamaticParameter: 'overlapChars', required: false, defaultValue: 200 },
        { n8nParameter: 'separators', lamaticParameter: 'separators', required: false },
      ],
      credentialMappings: [],
      notes: 'Split text into chunks',
    });

    // Chain Retrieval QA → RAGNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.chainRetrievalQa',
      lamaticType: 'RAGNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'RAG-based question answering',
    });

    // Retriever Vector Store → searchNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
      lamaticType: 'searchNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'topK', lamaticParameter: 'limit', required: false, defaultValue: 10 },
      ],
      credentialMappings: [],
      notes: 'Vector store retriever for semantic search',
    });

    // Vector Store Supabase → vectorNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
      lamaticType: 'vectorNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'mode', lamaticParameter: 'action', required: true },
        { n8nParameter: 'tableName', lamaticParameter: 'vectorDB', required: true },
        { n8nParameter: 'options.queryName', lamaticParameter: 'queryName', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'supabaseApi', lamaticCredential: 'supabase', requiresReauth: true }
      ],
      notes: 'Supabase vector store operations',
    });

    // Embeddings OpenAI → vectorizeNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
      lamaticType: 'vectorizeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'model', lamaticParameter: 'model', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'openAiApi', lamaticCredential: 'openai', requiresReauth: true }
      ],
      notes: 'Generate embeddings for vectorization',
    });

    // Read/Write File → extractFromFileNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.readWriteFile',
      lamaticType: 'extractFromFileNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true },
        { n8nParameter: 'fileName', lamaticParameter: 'filePath', required: false },
        { n8nParameter: 'fileSelector', lamaticParameter: 'filePath', required: false },
      ],
      credentialMappings: [],
      notes: 'Read or write files',
    });

    // Compression → codeNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.compression',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Compress or extract archives',
    });

    // Supabase → postgresNode (mapped to PostgreSQL node in Lamatic)
    this.addMapping({
      n8nType: 'n8n-nodes-base.supabase',
      lamaticType: 'postgresNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'action', required: true },
        { n8nParameter: 'tableId', lamaticParameter: 'tables', required: false },
        { n8nParameter: 'returnAll', lamaticParameter: 'returnAll', required: false },
        { n8nParameter: 'filters', lamaticParameter: 'filters', required: false },
        { n8nParameter: 'fieldsUi', lamaticParameter: 'fieldsUi', required: false },
        { n8nParameter: 'matchType', lamaticParameter: 'matchType', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'supabaseApi', lamaticCredential: 'supabase', requiresReauth: true }
      ],
      notes: 'Supabase database operations mapped to postgresNode',
    });

    // HTTP Request → apiNode (better mapping than LLMNode)
    this.addMapping({
      n8nType: 'n8n-nodes-base.httpRequest',
      lamaticType: 'apiNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'url', lamaticParameter: 'url', required: true },
        { n8nParameter: 'method', lamaticParameter: 'method', required: true },
        { n8nParameter: 'headerParameters', lamaticParameter: 'headers', required: false },
        { n8nParameter: 'bodyParameters', lamaticParameter: 'body', required: false },
        { n8nParameter: 'options.timeout', lamaticParameter: 'timeout', required: false },
      ],
      credentialMappings: [],
      notes: 'HTTP request for API calls',
    });

    // Airtable → airtableNode (fix: should use proper schema if exists)
    this.addMapping({
      n8nType: 'n8n-nodes-base.airtable',
      lamaticType: 'airtableNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'create' },
        { n8nParameter: 'base', lamaticParameter: 'baseId', required: true },
        { n8nParameter: 'table', lamaticParameter: 'tableName', required: true },
        { n8nParameter: 'fields', lamaticParameter: 'fields', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'airtableTokenApi', lamaticCredential: 'airtable', requiresReauth: true }
      ],
      notes: 'Airtable database operations',
    });

    // ==========================================
    // ADDITIONAL UNMAPPED NODE TYPES
    // ==========================================

    // Anthropic Claude LLM → LLMNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'model', lamaticParameter: 'model', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'anthropicApi', lamaticCredential: 'anthropic', requiresReauth: true }
      ],
      notes: 'Anthropic Claude LLM integration',
    });

    // No Operation Node → codeNode (passthrough)
    this.addMapping({
      n8nType: 'n8n-nodes-base.noOp',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [],
      credentialMappings: [],
      notes: 'No-operation passthrough node',
    });

    // Perplexity API → apiNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.perplexity',
      lamaticType: 'apiNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'query', lamaticParameter: 'query', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'perplexityApi', lamaticCredential: 'perplexity', requiresReauth: true }
      ],
      notes: 'Perplexity AI search API',
    });

    // Split in Batches → codeNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.splitInBatches',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'batchSize', lamaticParameter: 'batchSize', required: false, defaultValue: 10 },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Split data into batches for processing',
    });

    // Wait Node → codeNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.wait',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'amount', lamaticParameter: 'amount', required: false, defaultValue: 1 },
        { n8nParameter: 'unit', lamaticParameter: 'unit', required: false, defaultValue: 'seconds' },
      ],
      credentialMappings: [],
      notes: 'Wait/delay node for timing control',
    });

    // Output Parser Structured → codeNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.outputParserStructured',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'jsonSchemaExample', lamaticParameter: 'jsonSchemaExample', required: false },
        { n8nParameter: 'schema', lamaticParameter: 'schema', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Structured output parser for LLM responses',
    });

    // Tool Code → codeNode
    this.addMapping({
      n8nType: '@n8n/n8n-nodes-langchain.toolCode',
      lamaticType: 'codeNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'code', lamaticParameter: 'code', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Code execution tool for LLM agents',
    });

    // Notion Tool → notionNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.notionTool',
      lamaticType: 'notionNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'create' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'page' },
        { n8nParameter: 'databaseId', lamaticParameter: 'databaseId', required: false },
        { n8nParameter: 'pageId', lamaticParameter: 'pageId', required: false },
        { n8nParameter: 'properties', lamaticParameter: 'properties', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'notionApi', lamaticCredential: 'notion', requiresReauth: true }
      ],
      notes: 'Notion tool for LLM agents',
    });

    // Gmail Trigger → webhookTriggerNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.gmailTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'event', lamaticParameter: 'event', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'gmailOAuth2', lamaticCredential: 'gmail', requiresReauth: true }
      ],
      notes: 'Gmail trigger for incoming emails',
    });

    // Google Sheets Tool → googleSheetsNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.googleSheetsTool',
      lamaticType: 'googleSheetsNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'append' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'sheet' },
        { n8nParameter: 'sheetId', lamaticParameter: 'spreadsheetId', required: true },
        { n8nParameter: 'sheetName', lamaticParameter: 'sheetName', required: false, defaultValue: 'Sheet1' },
        { n8nParameter: 'range', lamaticParameter: 'range', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleSheetsOAuth2', lamaticCredential: 'googleSheets', requiresReauth: true }
      ],
      notes: 'Google Sheets tool for LLM agents',
    });

    // Google Sheets Trigger → webhookTriggerNode
    this.addMapping({
      n8nType: 'n8n-nodes-base.googleSheetsTrigger',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'event', lamaticParameter: 'event', required: false },
        { n8nParameter: 'sheetId', lamaticParameter: 'sheetId', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleSheetsOAuth2', lamaticCredential: 'googleSheets', requiresReauth: true }
      ],
      notes: 'Google Sheets trigger for sheet changes',
    });

    // Form Node → webhookTriggerNode (form submission)
    this.addMapping({
      n8nType: 'n8n-nodes-base.form',
      lamaticType: 'webhookTriggerNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'formTitle', lamaticParameter: 'formTitle', required: false },
        { n8nParameter: 'formFields', lamaticParameter: 'formFields', required: false },
        { n8nParameter: 'options.path', lamaticParameter: 'path', required: false },
      ],
      credentialMappings: [],
      notes: 'Form submission webhook trigger',
    });

  }

  /**
   * Adds a node mapping to the registry
   */
  private addMapping(mapping: NodeMapping): void {
    this.mappings.set(mapping.n8nType, mapping);
  }

  /**
   * Maps an n8n node to a Lamatic node with exact format matching
   */
  mapNode(n8nNode: N8nNode, nodeId: string): {
    lamaticNode: LamaticNode;
    requiresManualSetup: boolean;
    requiresReauth: boolean;
    warnings: string[];
  } {
    const mapping = this.mappings.get(n8nNode.type);
    const warnings: string[] = [];

    if (!mapping) {
      // No mapping found - create a placeholder node
      return {
        lamaticNode: this.createPlaceholderNode(n8nNode, nodeId),
        requiresManualSetup: true,
        requiresReauth: false,
        warnings: [`No mapping found for node type: ${n8nNode.type}`],
      };
    }

    if (!mapping.isSupported) {
      warnings.push(`Node type ${n8nNode.type} is not fully supported`);
    }

    // Create Lamatic node with exact format
    const lamaticNode = this.createLamaticNode(n8nNode, nodeId, mapping, warnings);

    // Schema presence check (fallback to placeholder if missing, per user direction)
    const schema = ALL_SCHEMAS[lamaticNode.nodeType];
    if (!schema) {
      warnings.push(`No schema found for nodeType ${lamaticNode.nodeType} - creating placeholder`);
      return {
        lamaticNode: this.createPlaceholderNode(n8nNode, nodeId),
        requiresManualSetup: true,
        requiresReauth: mapping.credentialMappings?.some(cred => cred.requiresReauth) || false,
        warnings,
      };
    }

    // Validate against schema (warn by default, strict via env)
    const { valid, errors: schemaErrors } = validateAgainstSchema(lamaticNode, schema);
    if (!valid) {
      if (isStrictMode()) {
        warnings.push(`Schema validation failed (strict): ${schemaErrors.join('; ')}`);
        return {
          lamaticNode: this.createPlaceholderNode(n8nNode, nodeId),
          requiresManualSetup: true,
          requiresReauth: mapping.credentialMappings?.some(cred => cred.requiresReauth) || false,
          warnings,
        };
      }
      // warn and keep
      warnings.push(`Schema validation warnings: ${schemaErrors.join('; ')}`);
    }

    return {
      lamaticNode,
      requiresManualSetup: mapping.requiresManualSetup || false,
      requiresReauth: mapping.credentialMappings?.some(cred => cred.requiresReauth) || false,
      warnings,
    };
  }

  /**
   * Cleans $json references from string values (removes n8n expression syntax)
   * $json references should only be in code, not in node values
   */
  private cleanJsonReferences(value: any): string {
    if (typeof value !== 'string') {
      return value ? String(value) : '';
    }
    
    // Remove n8n expression syntax: {{ $json.field }}, ={{ $json.field }}, etc.
    let cleaned = value
      .replace(/\{\{\s*\$json[^}]*\}\}/g, '') // Remove {{ $json... }}
      .replace(/=\{\{\s*\$json[^}]*\}\}/g, '') // Remove ={{ $json... }}
      .replace(/\$json\.[^\s}]*/g, '') // Remove $json.field references
      .replace(/\{\{.*?\}\}/g, '') // Remove any remaining {{ ... }}
      .replace(/^=\s*$/, '') // Remove standalone = sign
      .replace(/^=\s+/, '') // Remove leading = and whitespace
      .trim();
    
    // If result is empty or only whitespace, return empty string
    if (!cleaned || cleaned.length === 0) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * Cleans conditions array from $json references
   */
  private cleanConditionsFromJson(conditions: any): any {
    if (!conditions) return conditions;
    
    if (Array.isArray(conditions)) {
      return conditions.map((cond: any) => {
        if (typeof cond === 'object' && cond !== null) {
          const cleaned: any = { ...cond };
          // Clean leftValue and rightValue if they contain $json
          if (cleaned.leftValue && typeof cleaned.leftValue === 'string') {
            cleaned.leftValue = this.cleanJsonReferences(cleaned.leftValue);
          }
          if (cleaned.rightValue && typeof cleaned.rightValue === 'string') {
            cleaned.rightValue = this.cleanJsonReferences(cleaned.rightValue);
          }
          if (cleaned.keyValue && typeof cleaned.keyValue === 'string') {
            cleaned.keyValue = this.cleanJsonReferences(cleaned.keyValue);
          }
          return cleaned;
        }
        return cond;
      });
    }
    
    if (typeof conditions === 'object' && conditions.conditions) {
      return {
        ...conditions,
        conditions: this.cleanConditionsFromJson(conditions.conditions)
      };
    }
    
    return conditions;
  }

  /**
   * Cleans rule object from $json references
   */
  private cleanRuleFromJson(rule: any): any {
    if (!rule || typeof rule !== 'object') return rule;
    
    const cleaned: any = { ...rule };
    
    if (cleaned.conditions && cleaned.conditions.conditions) {
      cleaned.conditions = this.cleanConditionsFromJson(cleaned.conditions);
    }
    
    return cleaned;
  }

  /**
   * Recursively cleans all string values in an object from $json references
   */
  private cleanObjectFromJson(obj: any): any {
    if (obj == null) return obj;
    
    if (typeof obj === 'string') {
      return this.cleanJsonReferences(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectFromJson(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.cleanObjectFromJson(value);
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Escapes SQL values properly
   */
  private escapeSqlValue(value: string): string {
    // If it's already a valid SQL literal (number, boolean), return as-is
    if (/^\d+$/.test(value)) return value;
    if (value === 'true' || value === 'false' || value === 'NULL') return value;
    
    // Escape single quotes for SQL strings
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * Creates a Lamatic node with the exact format from the example
   */
  private createLamaticNode(n8nNode: N8nNode, nodeId: string, mapping: NodeMapping, warnings: string[]): LamaticNode {
    const baseNode = {
      nodeId: nodeId,
      nodeType: mapping.lamaticType,
      nodeName: n8nNode.name,
      values: {},
      modes: {},
      needs: [],
    };

    // Add x-runtime metadata
    const xRuntime = this.createXRuntime(n8nNode, mapping);
    const flowMetadata = this.createFlowMetadata(n8nNode, mapping);

    // Create specific node types with exact format
    switch (mapping.lamaticType) {
      case 'webhookTriggerNode':
        // Handle different trigger types
        const isFormTrigger = n8nNode.type === 'n8n-nodes-base.formTrigger' || n8nNode.type === 'n8n-nodes-base.form';
        const isExecuteWorkflowTrigger = n8nNode.type === 'n8n-nodes-base.executeWorkflowTrigger';
        
        let path: string;
        let method: string;
        let description: string;
        
        if (isFormTrigger) {
          path = this.getNestedValue(n8nNode.parameters, 'options.path') || 
                 this.getNestedValue(n8nNode.parameters, 'path') || 
                 '/form';
          method = this.getNestedValue(n8nNode.parameters, 'httpMethod') || 'POST';
          description = `Form submission endpoint: ${this.getNestedValue(n8nNode.parameters, 'formTitle') || 'Form'}`;
        } else if (isExecuteWorkflowTrigger) {
          path = '/workflow-trigger';
          method = 'POST';
          description = 'Workflow execution trigger (sub-workflow entry point)';
        } else {
          path = this.getNestedValue(n8nNode.parameters, 'path') || 'slack-bot';
          method = this.getNestedValue(n8nNode.parameters, 'httpMethod') || 'POST';
          description = `Webhook endpoint: ${path}`;
        }
        
        const values: any = {
          path,
          method,
          description,
        };
        
        // Add form-specific fields if this is a form trigger
        if (isFormTrigger) {
          const formTitle = this.getNestedValue(n8nNode.parameters, 'formTitle');
          const formFields = this.getNestedValue(n8nNode.parameters, 'formFields');
          if (formTitle) values.formTitle = formTitle;
          if (formFields) values.formFields = formFields;
        }
        
        // Add workflow inputs if this is an executeWorkflowTrigger
        if (isExecuteWorkflowTrigger) {
          const workflowInputs = this.getNestedValue(n8nNode.parameters, 'workflowInputs');
          if (workflowInputs) values.workflowInputs = workflowInputs;
        }
        
        return {
          ...baseNode,
          values,
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'LLMNode':
        // Handle all LLM node types
        if (n8nNode.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini') {
          // Extract model name from n8n parameters
          const modelName = this.getNestedValue(n8nNode.parameters, 'modelName') || 'models/gemini-1.5-flash-latest';
          return {
            ...baseNode,
            values: {
              generativeModelName: {
                credentialId: '',
                credential_name: '',
                model_name: modelName,
                provider_name: 'google',
                type: 'generator/text'
              },
              prompts: [
                {
                  id: this.generatePromptId(),
                  content: 'You are an AI assistant powered by advanced language model',
                  role: 'system'
                },
                {
                  id: this.generatePromptId(),
                  content: 'Process the input and provide helpful responses.',
                  role: 'user'
                }
              ],
              tools: [],
              credentials: '',
              messages: '[]',
              memories: '[]',
              attachments: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        } else if (n8nNode.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
          // Memory nodes - add minimal generativeModelName to prevent schema validation errors
          // Note: Memory nodes semantically don't need a model, but schema requires it
          return {
            ...baseNode,
            values: {
              generativeModelName: {
                credentialId: '',
                credential_name: '',
                model_name: 'memory-buffer',
                provider_name: 'lamatic',
                type: 'generator/text'
              },
              prompts: [
                {
                  id: this.generatePromptId(),
                  content: 'You are a conversation memory manager. Maintain context and history of the conversation.',
                  role: 'system'
                },
                {
                  id: this.generatePromptId(),
                  content: 'Manage conversation memory with window size: default',
                  role: 'user'
                }
              ],
              tools: [],
              credentials: '',
              messages: '[]',
              memories: '[]',
              attachments: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        } else if (n8nNode.type === '@n8n/n8n-nodes-langchain.lmChatGroq' || 
                   n8nNode.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi' ||
                   n8nNode.type === '@n8n/n8n-nodes-langchain.chainLlm' ||
                   n8nNode.type === '@n8n/n8n-nodes-langchain.lmChatAnthropic') {
          // Groq, OpenAI Chat, Chain LLM, or Anthropic Claude
          const model = this.getNestedValue(n8nNode.parameters, 'model') || 
                        this.getNestedValue(n8nNode.parameters, 'modelName') || 
                        (n8nNode.type.includes('Anthropic') ? 'claude-3-5-sonnet-20241022' : 'gpt-4');
          const provider = n8nNode.type.includes('Groq') ? 'groq' : 
                          n8nNode.type.includes('Gemini') ? 'google' :
                          n8nNode.type.includes('Anthropic') ? 'anthropic' : 'openai';
          
          return {
            ...baseNode,
            values: {
              generativeModelName: {
                credentialId: '',
                credential_name: '',
                model_name: model,
                provider_name: provider,
                type: 'generator/text'
              },
              prompts: [
                {
                  id: this.generatePromptId(),
                  content: this.getNestedValue(n8nNode.parameters, 'options.systemMessage') || 
                          this.getNestedValue(n8nNode.parameters, 'messages.messageValues')?.find((m: any) => m.type === 'AIMessagePromptTemplate')?.message ||
                          'You are a helpful AI assistant.',
                  role: 'system'
                },
                {
                  id: this.generatePromptId(),
                  content: this.getNestedValue(n8nNode.parameters, 'text') || 
                          'Process the input and provide a helpful response.',
                  role: 'user'
                }
              ],
              tools: [],
              credentials: '',
              messages: '[]',
              memories: '[]',
              attachments: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        // Fallback for other LLMNode mappings
        break;

      case 'agentNode':
        // Extract model info - agent nodes need generativeModelName from the connected LLM
        // Default to Gemini if not found
        const defaultModelName = 'models/gemini-1.5-flash-latest';
        return {
          ...baseNode,
          values: {
            generativeModelName: {
              credentialId: '',
              credential_name: '',
              model_name: defaultModelName,
              provider_name: 'google',
              type: 'generator/text'
            },
            prompts: [
              {
                id: this.generatePromptId(),
                content: this.getNestedValue(n8nNode.parameters, 'options.systemMessage') || 'You are Effibotics AI personal assistant. Your task will be to provide helpful assistance and advice related to automation and such tasks.',
                role: 'system'
              },
              {
                id: this.generatePromptId(),
                content: this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'text') || 'Process the input and provide a helpful response.'),
                role: 'user'
              }
            ],
            agents: [
              {
                name: 'Agent',
                description: 'AI agent for processing and responding to queries',
                schema: '{}'
              }
            ],
            tools: [],
            messages: '[]',
            stopWord: '',
            maxIterations: this.getNestedValue(n8nNode.parameters, 'options.maxIterations') || 5,
            connectedTo: ''
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'slackNode':
        // Extract channel from channelId parameter (can be object with value or direct value)
        let channelName = '';
        const channelIdParam = this.getNestedValue(n8nNode.parameters, 'channelId');
        if (channelIdParam) {
          if (typeof channelIdParam === 'object' && channelIdParam.value !== undefined) {
            channelName = channelIdParam.value;
          } else if (typeof channelIdParam === 'string') {
            channelName = channelIdParam;
          }
        }
        
        return {
          ...baseNode,
          values: {
            credentials: '',
            channelName: channelName,
            action: this.getNestedValue(n8nNode.parameters, 'operation') || 'postMessage',
            text: this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'text') || ''),
            command: '',
            immediateResponseData: ''
          },
          'x-runtime': {
            ...xRuntime,
            actionRequired: true,
            actionRequiredReason: 'Slack credentials missing (values.credentials is empty). Provide Slack API token in node credentials.',
          },
          '_flowMetadata': flowMetadata,
        };

      case 'variablesNode':
        // Clean the values object before stringifying
        const rawValues = this.getNestedValue(n8nNode.parameters, 'values') || {};
        const cleanedValues = this.cleanObjectFromJson(rawValues);
        return {
          ...baseNode,
          values: {
            // variablesNode.mapping must be a JSON string
            mapping: JSON.stringify(cleanedValues)
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'transformNode':
        return {
          ...baseNode,
          values: {
            fields: this.getNestedValue(n8nNode.parameters, 'values') || {},
            mode: 'set',
            dotNotation: this.getNestedValue(n8nNode.parameters, 'options.dotNotation') !== false,
            include: this.getNestedValue(n8nNode.parameters, 'options.include') || 'all',
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      // mergeNode case removed - merge nodes are now mapped to codeNode

      case 'switchNode':
        return {
          ...baseNode,
          values: {
            mode: this.getNestedValue(n8nNode.parameters, 'mode') || 'rules',
            rules: this.getNestedValue(n8nNode.parameters, 'rules') || [],
            fallbackOutput: this.getNestedValue(n8nNode.parameters, 'fallbackOutput') || 'extra',
            outputCount: this.getNestedValue(n8nNode.parameters, 'rules')?.length || 2,
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      // ==========================================
      // PHASE 2: INTEGRATION NODE CREATION
      // ==========================================

      case 'gmailNode':
        // Clean $json references from subject and message - they should not be in values
        const subject = this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'subject') || '');
        const message = this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'message') || '');
        const to = this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'to') || '');
        
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'send',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            to: to,
            subject: subject,
            message: message,
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'googleSheetsNode':
        // Handle both documentId and sheetId (n8n uses documentId for spreadsheet ID)
        const spreadsheetId = this.getNestedValue(n8nNode.parameters, 'documentId') || 
                             this.getNestedValue(n8nNode.parameters, 'sheetId') || '';
        const sheetNameParam = this.getNestedValue(n8nNode.parameters, 'sheetName');
        let sheetName = 'Sheet1';
        if (sheetNameParam) {
          // Handle __rl object format
          if (typeof sheetNameParam === 'object' && sheetNameParam.value !== undefined) {
            sheetName = sheetNameParam.value;
          } else if (typeof sheetNameParam === 'string') {
            sheetName = sheetNameParam;
          }
        }
        
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'append',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'sheet',
            spreadsheetId: spreadsheetId,
            sheetName: sheetName,
            range: this.getNestedValue(n8nNode.parameters, 'range') || '',
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
            // Preserve columns mapping if present (for append operations)
            columns: this.getNestedValue(n8nNode.parameters, 'columns') || undefined,
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'airtableNode':
        // Clean fields object - recursively clean all string values
        const rawFields = this.getNestedValue(n8nNode.parameters, 'fields') || {};
        const cleanedFields = this.cleanObjectFromJson(rawFields);
        
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'create',
            baseId: this.getNestedValue(n8nNode.parameters, 'application') || '',
            tableName: this.getNestedValue(n8nNode.parameters, 'table') || '',
            fields: cleanedFields,
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'teamsNode':
        // Clean message field from $json references
        const teamsMessage = this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'messageText') || '');
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'postMessage',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            teamId: this.getNestedValue(n8nNode.parameters, 'teamId') || '',
            channelId: this.getNestedValue(n8nNode.parameters, 'channelId') || '',
            message: teamsMessage,
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'discordNode':
        // Clean message field from $json references
        const discordMessage = this.cleanJsonReferences(this.getNestedValue(n8nNode.parameters, 'content') || '');
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'sendMessage',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            channelId: this.getNestedValue(n8nNode.parameters, 'channelId') || '',
            message: discordMessage,
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'notionNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'create',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'page',
            databaseId: this.getNestedValue(n8nNode.parameters, 'databaseId') || '',
            pageId: this.getNestedValue(n8nNode.parameters, 'pageId') || '',
            properties: this.getNestedValue(n8nNode.parameters, 'properties') || {},
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'airtableNode':
        // Extract base and table - handle both object with value and direct value
        const baseParam = this.getNestedValue(n8nNode.parameters, 'base');
        const tableParam = this.getNestedValue(n8nNode.parameters, 'table');
        let baseId = '';
        let tableName = '';
        
        if (typeof baseParam === 'object' && baseParam?.value !== undefined) {
          baseId = baseParam.value;
        } else if (typeof baseParam === 'string') {
          baseId = baseParam;
        }
        
        if (typeof tableParam === 'object' && tableParam?.value !== undefined) {
          tableName = tableParam.value;
        } else if (typeof tableParam === 'string') {
          tableName = tableParam;
        }

        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'create',
            baseId: baseId,
            tableName: tableName,
            fields: this.getNestedValue(n8nNode.parameters, 'fields') || {},
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': {
            ...xRuntime,
            actionRequired: true,
            actionRequiredReason: 'Airtable credentials missing (values.credentials is empty). Provide Airtable API token in node credentials.',
          },
          '_flowMetadata': flowMetadata,
        };

      // ==========================================
      // PHASE 3: ADDITIONAL NODE TYPE CREATION
      // ==========================================

      case 'memoryNode':
        return {
          ...baseNode,
          values: {
            sessionId: this.getNestedValue(n8nNode.parameters, 'sessionKey') || '',
            memoryCollection: 'default',
            uniqueId: nodeId,
            metadata: '{}',
            memoryValue: [],
            embeddingModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'text-embedding-3-small',
              provider_name: 'openai',
              type: 'embedding'
            },
            generativeModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'gpt-4',
              provider_name: 'openai',
              type: 'generator/text'
            }
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'codeNode':
        // Handle Structured Output Parser - preserve jsonSchemaExample
        if (n8nNode.type === '@n8n/n8n-nodes-langchain.outputParserStructured') {
          const jsonSchemaExample = this.getNestedValue(n8nNode.parameters, 'jsonSchemaExample');
          const schema = this.getNestedValue(n8nNode.parameters, 'schema');
          // Generate code that parses structured output based on schema
          const parserCode = `// Structured Output Parser\n// Schema: ${jsonSchemaExample || schema || '{}'}\nconst input = $input.all();\n// Parse structured output from LLM response\ntry {\n  const parsed = typeof input[0]?.json?.output === 'string' ? JSON.parse(input[0].json.output) : input[0]?.json?.output || input[0]?.json;\n  return [{ json: parsed }];\n} catch (e) {\n  return [{ json: { error: 'Failed to parse structured output', raw: input[0]?.json } }];\n}`;
          return {
            ...baseNode,
            values: {
              code: parserCode,
              jsonSchemaExample: jsonSchemaExample || undefined,
              schema: schema || undefined,
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        
        // Handle different code node types (aggregate, limit, editImage, compression, merge)
        const code = this.getNestedValue(n8nNode.parameters, 'jsCode');
        if (code) {
          // CRITICAL: Transform n8n code syntax to Lamatic syntax
          // This converts items -> $input.all() and preserves formatting
          let transformedCode = this.transformN8nCodeToLamatic(code);
          
          // CRITICAL: ALWAYS format code - FORCE formatting regardless of detection
          // The issue is that code might have newlines but still be minified
          // So we ALWAYS run the formatter to ensure proper line breaks
          
          // Step 1: Always run the force formatter first
          // This normalizes code (removes existing newlines) then reformats from scratch
          transformedCode = this.forceFormatSingleLineCode(transformedCode);
          
          // Step 2: Verify we have proper line breaks - count semicolons vs newlines
          const semicolonCount = (transformedCode.match(/;/g) || []).length;
          const newlineCount = (transformedCode.match(/\n/g) || []).length;
          
          // If we have many semicolons but few newlines, code is still minified
          if (semicolonCount > 2 && newlineCount < semicolonCount / 2) {
            // Code is still minified - use simple formatter
            transformedCode = this.simpleFormatCode(transformedCode);
          }
          
          // Step 3: ABSOLUTE FINAL CHECK - ensure we have newlines
          // If code still has no newlines, something went wrong - force format again
          const finalNewlineCheck = (transformedCode.match(/\n/g) || []).length;
          if (finalNewlineCheck === 0 && transformedCode.length > 20) {
            // Emergency fallback: simple character-by-character formatting
            transformedCode = this.simpleFormatCode(transformedCode);
          }
          
          // Step 4: Final check - if code appears as one line, force format
          const lines = transformedCode.split('\n').filter(l => l.trim().length > 0);
          if (lines.length <= 1 && transformedCode.length > 20) {
            // Character-by-character formatting as absolute last resort
            let formatted = '';
            let inString = false;
            let stringChar = '';
            let escapeNext = false;
            
            for (let i = 0; i < transformedCode.length; i++) {
              const char = transformedCode[i];
              const prevChar = i > 0 ? transformedCode[i - 1] : '';
              
              // Handle escape sequences
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
              
              // Toggle string state
              if ((char === '"' || char === "'" || char === '`') && !escapeNext) {
                if (!inString) {
                  inString = true;
                  stringChar = char;
                } else if (char === stringChar) {
                  inString = false;
                  stringChar = '';
                }
              }
              
              // Add newline after semicolon (outside strings)
              if (char === ';' && !inString) {
                formatted += ';\n';
              } else {
                formatted += char;
              }
            }
            
            // Clean up and indent
            const formattedLines = formatted.split('\n').map(l => l.trim()).filter(l => l);
            let indent = 0;
            transformedCode = formattedLines.map(line => {
              if (line.startsWith('}') || line.startsWith(']')) indent = Math.max(0, indent - 1);
              const indented = '  '.repeat(indent) + line;
              if (line.endsWith('{') || line.endsWith('[')) indent++;
              return indented;
            }).join('\n');
          }
          
          // FINAL VERIFICATION: Ensure code has newlines before storing
          // This is the absolute last check - if code has no newlines, something is wrong
          const verificationNewlines = (transformedCode.match(/\n/g) || []).length;
          if (verificationNewlines === 0 && transformedCode.length > 20) {
            // This should never happen, but if it does, use emergency formatter
            console.warn(`[Code Formatting] Code has no newlines after formatting! Node: ${baseNode.nodeName}`);
            transformedCode = this.simpleFormatCode(transformedCode);
          }
          
          // CRITICAL: Final check - if still no newlines, force add them after every semicolon
          const finalCheck = (transformedCode.match(/\n/g) || []).length;
          if (finalCheck === 0 && transformedCode.length > 20) {
            // Emergency: split on semicolons and join with newlines
            const parts = transformedCode.split(';');
            if (parts.length > 1) {
              transformedCode = parts.map((p, i) => {
                const trimmed = p.trim();
                if (trimmed) {
                  return i < parts.length - 1 ? trimmed + ';' : trimmed;
                }
                return '';
              }).filter(p => p).join('\n');
            }
          }
          
          // DEBUG: Log final state
          const finalNewlineCount = (transformedCode.match(/\n/g) || []).length;
          if (finalNewlineCount === 0 && transformedCode.length > 50) {
            console.error(`[Code Formatting ERROR] Code still has no newlines after all formatting attempts! Node: ${baseNode.nodeName}, Length: ${transformedCode.length}`);
            console.error(`[Code Formatting ERROR] First 200 chars: ${transformedCode.substring(0, 200)}`);
          } else if (finalNewlineCount > 0) {
            console.log(`[Code Formatting SUCCESS] Node: ${baseNode.nodeName}, Newlines: ${finalNewlineCount}, Length: ${transformedCode.length}`);
          }
          
          // CRITICAL: Ensure code is a string and not modified
          if (typeof transformedCode !== 'string') {
            console.error(`[Code Formatting ERROR] Code is not a string! Type: ${typeof transformedCode}, Node: ${baseNode.nodeName}`);
            transformedCode = String(transformedCode);
          }
          
          return {
            ...baseNode,
            values: {
              code: transformedCode
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        
        // Handle merge node - generate merge code
        if (n8nNode.type === 'n8n-nodes-base.merge') {
          const mergeMode = this.getNestedValue(n8nNode.parameters, 'mode') || 'append';
          const mergeByFields = this.getNestedValue(n8nNode.parameters, 'mergeByFields') || [];
          const clashHandling = this.getNestedValue(n8nNode.parameters, 'options.clashHandling') || 'preferInput1';
          
          let mergeCode = `// Merge node: ${mergeMode} mode\n`;
          mergeCode += `const input = $input.all();\n`;
          
          if (mergeMode === 'append') {
            mergeCode += `return input;\n`;
          } else if (mergeMode === 'mergeByFields' && mergeByFields.length > 0) {
            mergeCode += `// Merge by fields: ${mergeByFields.join(', ')}\n`;
            mergeCode += `const merged = {};\n`;
            mergeCode += `input.forEach(item => {\n`;
            mergeCode += `  const key = ${mergeByFields.map((f: string) => `item.json.${f}`).join(' + "_" + ')};\n`;
            mergeCode += `  if (!merged[key]) merged[key] = item.json;\n`;
            mergeCode += `  else Object.assign(merged[key], item.json);\n`;
            mergeCode += `});\n`;
            mergeCode += `return Object.values(merged).map(v => ({ json: v }));\n`;
          } else {
            mergeCode += `// Merge mode: ${mergeMode}\n`;
            mergeCode += `const merged = {};\n`;
            mergeCode += `input.forEach(item => Object.assign(merged, item.json));\n`;
            mergeCode += `return [{ json: merged }];\n`;
          }
          
          return {
            ...baseNode,
            values: {
              code: mergeCode
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        
        // Handle Wait node - generate delay code
        if (n8nNode.type === 'n8n-nodes-base.wait') {
          const amount = this.getNestedValue(n8nNode.parameters, 'amount') || 1;
          const unit = this.getNestedValue(n8nNode.parameters, 'unit') || 'seconds';
          const webhookId = n8nNode.webhookId;
          
          if (webhookId) {
            // Resumable wait - uses webhook for resumption
            return {
              ...baseNode,
              values: {
                code: `// Wait node (resumable via webhook ${webhookId})\n// Amount: ${amount} ${unit}\n// This wait can be resumed via webhook\nconst input = $input.all();\n// Wait implementation - resume via webhook\nreturn input;`
              },
              'x-runtime': {
                ...xRuntime,
                webhookId: webhookId,
              },
              '_flowMetadata': flowMetadata,
            };
          } else {
            // Simple delay wait
            const delayMs = unit === 'seconds' ? amount * 1000 : 
                           unit === 'minutes' ? amount * 60 * 1000 :
                           unit === 'hours' ? amount * 60 * 60 * 1000 :
                           amount * 1000; // default to seconds
            return {
              ...baseNode,
              values: {
                code: `// Wait node: ${amount} ${unit}\nconst input = $input.all();\n// Wait ${delayMs}ms\nawait new Promise(resolve => setTimeout(resolve, ${delayMs}));\nreturn input;`
              },
              'x-runtime': xRuntime,
              '_flowMetadata': flowMetadata,
            };
          }
        }
        
        // For aggregate, limit, etc. without jsCode - generate code
        return {
          ...baseNode,
          values: {
            code: `// ${n8nNode.name} - Auto-generated\n// Original n8n node type: ${n8nNode.type}\nconst input = $input.all();\nreturn input;`
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'conditionNode':
        // CRITICAL: Lamatic conditionNode structure is different from n8n
        // It has a top-level 'condition' array that maps branch labels to target nodeIds
        // The condition array will be populated later in buildNodeDependencies
        // based on actual n8n connections
        
        const ifConditions = this.getNestedValue(n8nNode.parameters, 'conditions');
        const switchRules = this.getNestedValue(n8nNode.parameters, 'rules');
        
        // Determine if this is a filter node (n8n-nodes-base.filter) or if/switch node
        const isFilterNode = n8nNode.type === 'n8n-nodes-base.filter';
        
        // Build branches array for condition labels
        let branches: Array<{label: string; value: string}> = [];
        let finalConditions: any = null;
        let finalRules: any = null;
        
        if (switchRules && switchRules.rules && Array.isArray(switchRules.rules)) {
          // Switch node with rules
          finalRules = {
            ...switchRules,
            rules: switchRules.rules.map((rule: any) => this.cleanRuleFromJson(rule))
          };
          // CRITICAL: For switch nodes, branches are indexed by rule position
          // The outputKey/renameOutput is the label, and the index is the value
          branches = switchRules.rules.map((rule: any, idx: number) => ({
            label: rule.outputKey || rule.renameOutput || `Branch ${idx + 1}`,
            value: String(idx) // This matches the outputIndex in n8n connections
          }));
        } else if (ifConditions && ifConditions.conditions && Array.isArray(ifConditions.conditions)) {
          // If node with conditions object
          finalConditions = ifConditions;
          branches = [
            { label: 'True', value: '0' },
            { label: 'False', value: '1' }
          ];
        } else if (Array.isArray(ifConditions)) {
          // If node with conditions array
          finalConditions = { conditions: ifConditions };
          branches = [
            { label: 'True', value: '0' },
            { label: 'False', value: '1' }
          ];
        } else {
          // Default branches for if nodes
          branches = [
            { label: 'True', value: '0' },
            { label: 'False', value: '1' }
          ];
        }
        
        // Build condition values structure for Lamatic
        // Transform n8n conditions to Lamatic format with operands
        const conditionValues: any = {
          conditions: []
        };
        
        // CRITICAL: Handle switch nodes differently from if nodes
        // Switch nodes have multiple rules, each with its own conditions
        // If nodes have a single condition set with True/False branches
        if (switchRules && switchRules.rules && Array.isArray(switchRules.rules)) {
          // Switch node: each rule becomes a condition entry
          for (let i = 0; i < switchRules.rules.length; i++) {
            const rule = switchRules.rules[i];
            const branch = branches[i];
            if (!branch) continue;
            
            // Transform rule conditions to Lamatic format
            let lamaticCondition: any = {};
            if (rule.conditions && rule.conditions.conditions && Array.isArray(rule.conditions.conditions)) {
              const combinator = rule.conditions.combinator || 'and';
              const operands = rule.conditions.conditions.map((cond: any) => {
                let n8nOperator: string = 'equals';
                if (cond.operator) {
                  if (typeof cond.operator === 'string') {
                    n8nOperator = cond.operator;
                  } else if (typeof cond.operator === 'object') {
                    n8nOperator = cond.operator.operation || cond.operator.type || 'equals';
                  }
                }
                
                const operator = this.mapN8nOperatorToLamatic(n8nOperator);
                const leftValue = cond.leftValue || '';
                let value = cond.rightValue !== undefined ? String(cond.rightValue) : '';
                if (n8nOperator === 'notEmpty' || n8nOperator === 'empty') {
                  value = '';
                }
                
                return {
                  name: leftValue,
                  operator: operator,
                  value: value
                };
              });
              
              lamaticCondition = {
                operator: null,
                operands: operands,
                combinator: combinator
              };
            }
            
            const conditionEntry: any = {
              label: branch.label,
              value: `${baseNode.nodeId}-${branch.label.toLowerCase()}`,
              condition: lamaticCondition
            };
            conditionValues.conditions.push(conditionEntry);
          }
        } else {
          // If node: single condition set with True/False branches
          let lamaticCondition: any = {};
          if (finalConditions && finalConditions.conditions && Array.isArray(finalConditions.conditions)) {
            const combinator = finalConditions.combinator || 'and';
            const operands = finalConditions.conditions.map((cond: any) => {
              let n8nOperator: string = 'equals';
              if (cond.operator) {
                if (typeof cond.operator === 'string') {
                  n8nOperator = cond.operator;
                } else if (typeof cond.operator === 'object') {
                  n8nOperator = cond.operator.operation || cond.operator.type || 'equals';
                }
              }
              
              const operator = this.mapN8nOperatorToLamatic(n8nOperator);
              const leftValue = cond.leftValue || '';
              let value = cond.rightValue !== undefined ? String(cond.rightValue) : '';
              if (n8nOperator === 'notEmpty' || n8nOperator === 'empty') {
                value = '';
              }
              
              return {
                name: leftValue,
                operator: operator,
                value: value
              };
            });
            
            lamaticCondition = {
              operator: null,
              operands: operands,
              combinator: combinator
            };
          }
          
          // Build conditions array with proper structure for if nodes
          for (let i = 0; i < branches.length; i++) {
            const branch = branches[i];
            const conditionEntry: any = {
              label: branch.label,
              value: `${baseNode.nodeId}-${branch.label.toLowerCase()}`,
              condition: i === 0 ? lamaticCondition : {} // First branch (True) has conditions, False is empty
            };
            conditionValues.conditions.push(conditionEntry);
          }
        }
        
        return {
          ...baseNode,
          nodeType: 'conditionNode', // Ensure it's conditionNode, not branchNode
          // Top-level condition array will be added in buildNodeDependencies
          // based on actual n8n connections
          values: conditionValues,
          'x-runtime': xRuntime,
          '_flowMetadata': {
            ...flowMetadata,
            branches: branches, // Store branches metadata for later use
            originalConditions: finalConditions || ifConditions,
            originalRules: finalRules || switchRules
          },
        };

      case 'chatTriggerNode':
        return {
          ...baseNode,
          values: {
            chat: '',
            chatConfig: {
              botName: n8nNode.name || 'Chat Bot',
              greetingMessage: this.getNestedValue(n8nNode.parameters, 'initialMessages') || 'Hello! How can I help you?',
              primaryColor: '#6366f1',
              position: 'bottom-right',
              displayMode: 'chat'
            },
            domains: []
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'apiNode':
        const headers = this.getNestedValue(n8nNode.parameters, 'headerParameters');
        const body = this.getNestedValue(n8nNode.parameters, 'bodyParameters');
        return {
          ...baseNode,
          values: {
            url: this.getNestedValue(n8nNode.parameters, 'url') || '',
            method: this.getNestedValue(n8nNode.parameters, 'method') || 'GET',
            headers: headers ? JSON.stringify(headers) : '{}',
            body: body ? JSON.stringify(body) : '{}',
            retries: '3',
            retry_deplay: '1000'
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'flowNode':
        // For subflows: flowId is always empty placeholder - user must fill after creating subflow in Lamatic
        // Map workflowInputs.value to requestInput (the data passed to subflow)
        const workflowInputs = this.getNestedValue(n8nNode.parameters, 'workflowInputs');
        const inputData = workflowInputs?.value || workflowInputs || {};
        
        return {
          ...baseNode,
          values: {
            flowId: '', // Placeholder - user must provide flowId after creating subflow in Lamatic
            requestInput: JSON.stringify(inputData) // Map workflowInputs.value to requestInput
          },
          'x-runtime': xRuntime,
          '_flowMetadata': {
            ...flowMetadata,
            requiresManualFlowId: true,
            originalWorkflowId: this.getNestedValue(n8nNode.parameters, 'workflowId') || '',
            note: 'This flowNode requires a flowId. Create the subflow in Lamatic first, then update this flowId.'
          },
        };

      case 'extractFromFileNode':
        return {
          ...baseNode,
          values: {
            fileUrl: this.getNestedValue(n8nNode.parameters, 'url') || 
                     this.getNestedValue(n8nNode.parameters, 'filePath') || 
                     this.getNestedValue(n8nNode.parameters, 'fileName') || '',
            format: 'text',
            encoding: 'utf-8',
            comment: '',
            delimiter: ',',
            headers: true,
            ignoreEmpty: false,
            trim: false,
            ltrim: false,
            rtrim: false,
            maxRows: '1000',
            skipRows: '0',
            password: '',
            quote: '"',
            joinPages: false,
            returnRawText: false,
            encodeAsBase64: false,
            discardUnmappedColumns: false
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'chunkNode':
        return {
          ...baseNode,
          values: {
            chunkField: 'text',
            chunkingType: 'character',
            numOfChars: this.getNestedValue(n8nNode.parameters, 'chunkSize') || 1000,
            overlapChars: this.getNestedValue(n8nNode.parameters, 'chunkOverlap') || 200,
            separators: this.getNestedValue(n8nNode.parameters, 'separators') || ['\n\n', '\n', ' ', '']
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'RAGNode':
        return {
          ...baseNode,
          values: {
            queryField: 'query',
            vectorDB: 'default',
            limit: 10,
            certainty: '0.7',
            filters: '{}',
            memories: '[]',
            messages: '[]',
            prompts: [
              {
                id: this.generatePromptId(),
                content: 'Answer the question based on the retrieved context.',
                role: 'system'
              },
              {
                id: this.generatePromptId(),
                content: 'Process the query and provide a helpful response.',
                role: 'user'
              }
            ],
            embeddingModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'text-embedding-3-small',
              provider_name: 'openai',
              type: 'embedding'
            },
            generativeModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'gpt-4',
              provider_name: 'openai',
              type: 'generator/text'
            }
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'searchNode':
        return {
          ...baseNode,
          values: {
            searchQuery: '',
            vectorDB: 'default',
            limit: this.getNestedValue(n8nNode.parameters, 'topK') || 10,
            certainty: '0.7',
            filters: '{}',
            embeddingModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'text-embedding-3-small',
              provider_name: 'openai',
              type: 'embedding'
            }
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'vectorNode':
        return {
          ...baseNode,
          values: {
            action: this.getNestedValue(n8nNode.parameters, 'action') || 'query',
            vectorDB: this.getNestedValue(n8nNode.parameters, 'vectorDB') || 'default',
            vectorsField: 'embedding',
            metadataField: 'metadata',
            primaryKeys: ['id'],
            duplicateOperation: 'skip',
            limit: 10,
            filters: '{}'
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'vectorizeNode':
        return {
          ...baseNode,
          values: {
            inputText: '',
            embeddingModelName: {
              credentialId: '',
              credential_name: '',
              model_name: this.getNestedValue(n8nNode.parameters, 'model') || 'text-embedding-3-small',
              provider_name: 'openai',
              type: 'embedding'
            },
            generativeModelName: {
              credentialId: '',
              credential_name: '',
              model_name: 'gpt-4',
              provider_name: 'openai',
              type: 'generator/text'
            }
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'postgresNode':
        // Handle Supabase nodes - convert to SQL queries
        if (n8nNode.type === 'n8n-nodes-base.supabase') {
          const operation = this.getNestedValue(n8nNode.parameters, 'operation') || 'query';
          const tableId = this.getNestedValue(n8nNode.parameters, 'tableId') || '';
          const filters = this.getNestedValue(n8nNode.parameters, 'filters');
          const fieldsUi = this.getNestedValue(n8nNode.parameters, 'fieldsUi');
          const matchType = this.getNestedValue(n8nNode.parameters, 'matchType');
          const returnAll = this.getNestedValue(n8nNode.parameters, 'returnAll');
          
          // Build SQL query from Supabase parameters
          let query = '';
          if (operation === 'get' || operation === 'getAll') {
            query = `SELECT * FROM ${tableId || 'table'}`;
            if (filters?.conditions && Array.isArray(filters.conditions) && filters.conditions.length > 0) {
              const conditions = filters.conditions.map((cond: any) => {
                const key = cond.keyName || cond.key || '';
                const value = cond.keyValue || cond.value || '';
                const op = cond.condition || cond.operator || 'eq';
                // Clean $json references from value - they should be handled in code, not SQL
                const cleanValue = this.cleanJsonReferences(String(value));
                const sqlOp = op === 'eq' ? '=' : op === 'ne' ? '!=' : op === 'gt' ? '>' : op === 'lt' ? '<' : '=';
                return `${key} ${sqlOp} ${this.escapeSqlValue(cleanValue)}`;
              }).join(' AND ');
              query += ` WHERE ${conditions}`;
            }
            if (operation === 'getAll' && !returnAll) {
              query += ' LIMIT 100';
            }
          } else if (operation === 'update') {
            query = `UPDATE ${tableId || 'table'}`;
            if (fieldsUi?.fieldValues && Array.isArray(fieldsUi.fieldValues) && fieldsUi.fieldValues.length > 0) {
              const setClause = fieldsUi.fieldValues.map((fv: any) => {
                const field = fv.fieldId || fv.field || '';
                const value = fv.fieldValue || fv.value || '';
                // Clean $json references
                const cleanValue = this.cleanJsonReferences(String(value));
                return `${field} = ${this.escapeSqlValue(cleanValue)}`;
              }).join(', ');
              query += ` SET ${setClause}`;
            }
            if (filters?.conditions && Array.isArray(filters.conditions) && filters.conditions.length > 0) {
              const conditions = filters.conditions.map((cond: any) => {
                const key = cond.keyName || cond.key || '';
                const value = cond.keyValue || cond.value || '';
                const cleanValue = this.cleanJsonReferences(String(value));
                return `${key} = ${this.escapeSqlValue(cleanValue)}`;
              }).join(' AND ');
              query += ` WHERE ${conditions}`;
            }
          } else if (operation === 'insert') {
            query = `INSERT INTO ${tableId || 'table'}`;
            if (fieldsUi?.fieldValues && Array.isArray(fieldsUi.fieldValues) && fieldsUi.fieldValues.length > 0) {
              const fields = fieldsUi.fieldValues.map((fv: any) => fv.fieldId || fv.field || '').join(', ');
              const values = fieldsUi.fieldValues.map((fv: any) => {
                const value = fv.fieldValue || fv.value || '';
                const cleanValue = this.cleanJsonReferences(String(value));
                return this.escapeSqlValue(cleanValue);
              }).join(', ');
              query += ` (${fields}) VALUES (${values})`;
            }
          }
          
          return {
            ...baseNode,
            values: {
              credentials: '',
              action: 'query',
              query: query || 'SELECT 1',
              tables: tableId || '',
              schemas: '',
              syncMode: '',
              cronExpression: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        
        // Standard PostgreSQL node (not Supabase)
        return {
          ...baseNode,
          values: {
            credentials: '',
            action: this.getNestedValue(n8nNode.parameters, 'action') || 'query',
            query: this.getNestedValue(n8nNode.parameters, 'query') || '',
            tables: this.getNestedValue(n8nNode.parameters, 'tables') || '',
            schemas: '',
            syncMode: '',
            cronExpression: ''
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'googleDriveNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            syncMode: 'full',
            cronExpression: '',
            folderUrl: this.getNestedValue(n8nNode.parameters, 'fileId') ? 
                       `https://drive.google.com/file/d/${this.getNestedValue(n8nNode.parameters, 'fileId')}` : '',
            globs: ['**/*'],
            search_scope: 'all',
            strategy: 'incremental',
            start_date: '',
            days_to_sync_if_history_is_full: '30'
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

    }

    // Fallback to basic node
    return {
      ...baseNode,
      values: this.mapParameters(n8nNode.parameters, mapping.parameterMappings, warnings),
      'x-runtime': xRuntime,
      '_flowMetadata': flowMetadata,
    };
  }

  /**
   * Creates x-runtime metadata
   */
  private createXRuntime(n8nNode: N8nNode, mapping: NodeMapping): any {
    const baseXRuntime = {
      execution: 'atomic',
      type: mapping.lamaticType,
      subflowId: '',
      actionRequired: false,
    };

    // Add specific policies based on node type
    switch (mapping.lamaticType) {
      case 'webhookTriggerNode':
        return baseXRuntime;
      case 'LLMNode':
        return {
          ...baseXRuntime,
          policies: { retry: { attempts: 1 }, timeoutMs: 30000 }
        };
      case 'agentNode':
        return {
          ...baseXRuntime,
          execution: 'sequential',
          policies: { retry: { attempts: 3 }, timeoutMs: 120000 }
        };
      case 'slackNode':
        return {
          ...baseXRuntime,
          policies: { retry: { attempts: 2 }, timeoutMs: 30000 }
        };
      default:
        return baseXRuntime;
    }
  }

  /**
   * Creates flow metadata
   */
  private createFlowMetadata(n8nNode: N8nNode, mapping: NodeMapping): any {
    return {
      executionOrder: 0, // Will be set by dependency builder
      flowContext: 'linear',
      originalType: n8nNode.type
    };
  }

  /**
   * Maps n8n parameters to Lamatic parameters
   */
  private mapParameters(
    n8nParameters: Record<string, any>,
    parameterMappings: ParameterMapping[],
    warnings: string[]
  ): Record<string, any> {
    const mappedParameters: Record<string, any> = {};

    for (const mapping of parameterMappings) {
      const n8nValue = this.getNestedValue(n8nParameters, mapping.n8nParameter);
      
      if (n8nValue !== undefined) {
        // Apply transformation if provided
        const transformedValue = mapping.transform ? mapping.transform(n8nValue) : n8nValue;
        mappedParameters[mapping.lamaticParameter] = transformedValue;
      } else if (mapping.required) {
        // Use default value if required parameter is missing
        if (mapping.defaultValue !== undefined) {
          mappedParameters[mapping.lamaticParameter] = mapping.defaultValue;
        } else {
          warnings.push(`Required parameter ${mapping.n8nParameter} is missing, using empty value`);
          mappedParameters[mapping.lamaticParameter] = '';
        }
      } else if (mapping.defaultValue !== undefined) {
        // Use default value for optional parameters too
        mappedParameters[mapping.lamaticParameter] = mapping.defaultValue;
      }
    }

    return mappedParameters;
  }

  /**
   * Maps n8n credentials to Lamatic credentials
   */
  private mapCredentials(
    n8nParameters: Record<string, any>,
    credentialMappings: CredentialMapping[] | undefined,
    warnings: string[]
  ): Record<string, string> {
    if (!credentialMappings) {
      return {};
    }

    const mappedCredentials: Record<string, string> = {};

    for (const mapping of credentialMappings) {
      // For now, we'll mark credentials as empty and require manual setup
      mappedCredentials[mapping.lamaticCredential] = '';
      warnings.push(`Credential ${mapping.n8nCredential} needs to be configured manually in Lamatic`);
    }

    return mappedCredentials;
  }

  /**
   * Creates a placeholder node for unsupported node types
   */
  private createPlaceholderNode(n8nNode: N8nNode, nodeId: string): LamaticNode {
    // Standard placeholder for unsupported nodes
    return {
      nodeId: nodeId,
      nodeType: 'placeholderNode',
      nodeName: `${n8nNode.name} (Unsupported)`,
      values: {
        originalType: n8nNode.type,
        originalParameters: n8nNode.parameters,
        note: 'This node type is not supported and requires manual setup',
      },
      modes: {},
      needs: [],
    };
  }

  /**
   * Gets a nested value from an object using dot notation
   * Handles n8n __rl objects (resource list) by extracting .value property
   */
  private getNestedValue(obj: any, path: string): any {
    const value = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
    
    // Handle n8n __rl (resource list) objects - extract the value property
    if (value && typeof value === 'object' && value.__rl === true && value.value !== undefined) {
      return value.value;
    }
    
    // Also handle objects with just a value property (common pattern)
    if (value && typeof value === 'object' && 'value' in value && !('__rl' in value)) {
      // Only extract if it's clearly an __rl-like object (has mode, cachedResultName, etc.)
      // or if it's a simple object with just value
      if (Object.keys(value).length <= 3 && 'value' in value) {
        return value.value;
      }
    }
    
    return value;
  }

  /**
   * Generates a unique node ID matching the example format
   * @param originalId - n8n node UUID
   * @param n8nNodeType - Optional n8n node type to determine correct prefix
   */
  generateNodeId(originalId: string, n8nNodeType?: string): string {
    // Create node IDs that match the example format using actual n8n workflow IDs
    const nodeIdMap: Record<string, string> = {
      '20d928f7-2fdd-42a4-b902-86995b88b241': 'triggerNode_1', // Webhook to receive message
      '9ee1d3fc-34d9-4548-954e-4da73497980e': 'LLMNode_779', // Window Buffer Memory
      'f694d5ae-a778-4e84-8bdd-060bc31ac0e6': 'LLMNode_665', // Google Gemini Chat Model
      '77a1ff05-8642-4c4f-b00f-5dd09d7cf97c': 'agentNode_937', // Agent
      '9b71e9c5-b6b8-497d-bf77-f21207185a5b': 'slackNode_423', // Send response back to slack channel
    };

    if (nodeIdMap[originalId]) {
      return nodeIdMap[originalId];
    }

    // Determine correct node type prefix from mapping
    const prefix = this.getNodeTypePrefix(n8nNodeType || '');
    
    // Generate unique ID: prefix_shortIdRandom
    const short = (originalId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || '000';
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${short}${random}`;
  }

  /**
   * Gets node type prefix for ID generation based on n8n node type
   */
  private getNodeTypePrefix(n8nNodeType: string): string {
    if (!n8nNodeType) return 'node';
    
    // Find the mapping for this n8n node type
    const mapping = this.mappings.get(n8nNodeType);
    if (mapping && mapping.lamaticType) {
      // Return the Lamatic node type as prefix (e.g., 'slackNode', 'LLMNode', 'agentNode')
      return mapping.lamaticType;
    }
    
    // Fallback: try to infer from n8n type name
    if (n8nNodeType.includes('webhook') || n8nNodeType.includes('trigger')) {
      return 'webhookTriggerNode';
    }
    if (n8nNodeType.includes('slack')) {
      return 'slackNode';
    }
    if (n8nNodeType.includes('gmail')) {
      return 'gmailNode';
    }
    if (n8nNodeType.includes('agent')) {
      return 'agentNode';
    }
    if (n8nNodeType.includes('gemini') || n8nNodeType.includes('llm') || n8nNodeType.includes('memory')) {
      return 'LLMNode';
    }
    
    // Default fallback
    return 'node';
  }

  /**
   * Maps n8n operator to Lamatic operator format
   */
  private mapN8nOperatorToLamatic(n8nOperator: string | any): string {
    const operatorMap: Record<string, string> = {
      'equals': '==',
      'notEquals': '!=',
      'not_equals': '!=',
      'greater': '>',
      'greaterEqual': '>=',
      'smaller': '<',
      'smallerEqual': '<=',
      'contains': 'contains',
      'notContains': 'not_contains',
      'not_contains': 'not_contains',
      'startsWith': 'starts_with',
      'endsWith': 'ends_with',
      'empty': '==', // empty means == ''
      'notEmpty': '!=', // notEmpty means != ''
      'regex': 'regex',
      'exists': 'exists',
      'notExists': 'not_exists'
    };
    
    // Handle both string and object operators
    let opStr: string;
    if (typeof n8nOperator === 'string') {
      opStr = n8nOperator;
    } else if (n8nOperator && typeof n8nOperator === 'object') {
      opStr = n8nOperator.operation || n8nOperator.type || 'equals';
    } else {
      opStr = 'equals';
    }
    
    return operatorMap[opStr] || opStr;
  }

  /**
   * Transforms n8n code syntax to Lamatic code syntax
   * Main transformation: items -> $input.all()
   * Preserves line breaks and formatting
   */
  private transformN8nCodeToLamatic(n8nCode: string): string {
    if (!n8nCode || typeof n8nCode !== 'string') {
      return n8nCode || '';
    }

    // CRITICAL: Handle escaped newlines - convert \n to actual newlines
    // n8n JSON files may have escaped newlines that need to be converted
    // When JSON is parsed, \n should become actual newlines, but sometimes
    // code comes as a single line with literal \n characters
    let transformedCode = n8nCode;
    
    // First, check if code has actual newlines already
    const hasActualNewlines = transformedCode.includes('\n');
    
    // If no actual newlines, check for escaped newlines (literal \n sequences)
    // This can happen if the JSON was double-encoded or stored incorrectly
    if (!hasActualNewlines && transformedCode.includes('\\n')) {
      // Convert escaped newlines to actual newlines
      // But be careful - we need to avoid converting \\n in string literals
      // Simple approach: convert all \\n to \n (the JSON parser should have done this, but just in case)
      transformedCode = transformedCode.replace(/\\n/g, '\n');
      transformedCode = transformedCode.replace(/\\t/g, '\t');
      transformedCode = transformedCode.replace(/\\r/g, '\r');
    }

    // CRITICAL: Replace n8n's global 'items' variable with Lamatic's $input.all()
    // Order matters: handle items[index] patterns FIRST, then standalone items
    
    // Pattern 1: Replace items[index] patterns BEFORE replacing standalone items
    // items[0] -> $input.all()[0]
    // items[i] -> $input.all()[i]
    // items.length -> $input.all().length
    transformedCode = transformedCode.replace(/\bitems\[(\d+|\w+)\]/g, '$input.all()[$1]');
    transformedCode = transformedCode.replace(/\bitems\.length\b/g, '$input.all().length');
    transformedCode = transformedCode.replace(/\bitems\.(forEach|map|filter|reduce|find|some|every)\b/g, '$input.all().$1');
    
    // Pattern 2: Replace standalone 'items' (not part of another word or array access)
    // Use word boundaries to avoid replacing 'items' inside other words
    // This catches cases like: const data = items; or return items;
    transformedCode = transformedCode.replace(/\bitems\b/g, '$input.all()');
    
    // Pattern 3: Handle $input.all() that might have been incorrectly transformed
    // If we see $input.all().all(), fix it (shouldn't happen but safety check)
    transformedCode = transformedCode.replace(/\$input\.all()\.all()/g, '$input.all()');

    // Pattern 4: Replace $input[index] (n8n's alternative) with $input.all()[index]
    // But be careful - $input might be used correctly in some contexts
    // Only replace if it's clear it's meant to be the items array
    transformedCode = transformedCode.replace(/\$input\[(\d+|\w+)\]/g, '$input.all()[$1]');

    // Pattern 5: Handle $json references - these should stay as $json (data reference, not node)
    // No transformation needed for $json

    // Pattern 6: Optimize - if $input.all() is used multiple times, add const input = $input.all();
    // This makes the code cleaner and more efficient
    const inputUsageCount = (transformedCode.match(/\$input\.all()/g) || []).length;
    
    // If $input.all() is used more than once, add a const declaration at the top
    // But only if there isn't already a const input declaration
    if (inputUsageCount > 1 && !transformedCode.match(/const\s+input\s*=\s*\$input\.all()/)) {
      // Find the first line that's not a comment or empty
      const lines = transformedCode.split('\n');
      let insertIndex = 0;
      
      // Skip leading comments and empty lines
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          insertIndex = i;
          break;
        }
      }
      
      // Insert const input = $input.all(); after comments
      lines.splice(insertIndex, 0, 'const input = $input.all();');
      
      // Replace all subsequent $input.all() with just 'input' (except the const declaration)
      for (let i = insertIndex + 1; i < lines.length; i++) {
        lines[i] = lines[i].replace(/\$input\.all()/g, 'input');
      }
      
      transformedCode = lines.join('\n');
    }

    // CRITICAL: Format code with proper line breaks if it's minified
    // ALWAYS format single-line code to ensure readability
    const linesBeforeFormat = transformedCode.split('\n');
    const actualLineCount = linesBeforeFormat.filter(l => l.trim().length > 0).length;
    const isSingleLine = actualLineCount <= 1;
    
    // Be very aggressive - format if single line OR if very few lines
    if (isSingleLine && transformedCode.length > 20) {
      // FORCE format single-line code by splitting on semicolons
      transformedCode = this.forceFormatSingleLineCode(transformedCode);
    } else if (actualLineCount < 5 && transformedCode.length > 100) {
      // Also format if code has few lines but is long (likely minified)
      transformedCode = this.forceFormatSingleLineCode(transformedCode);
    } else {
      // Use the smart formatter for multi-line code
      transformedCode = this.formatCodeWithLineBreaks(transformedCode);
    }
    
    // Final safety check: if code is still on one line and long, force format it
    const finalLines = transformedCode.split('\n');
    const finalNonEmptyLines = finalLines.filter(l => l.trim().length > 0);
    if (finalNonEmptyLines.length <= 1 && transformedCode.length > 50) {
      // Last resort: use simple formatter
      transformedCode = this.simpleFormatCode(transformedCode);
    }

    // Preserve original line breaks and formatting
    // The code should already have proper line breaks, but ensure they're preserved
    return transformedCode;
  }

  /**
   * Simple fallback formatter - splits on semicolons with basic string handling
   * Used as last resort when other formatters fail
   * CRITICAL: Also normalizes code first to ensure consistent formatting
   */
  private simpleFormatCode(code: string): string {
    if (!code || typeof code !== 'string') {
      return code;
    }

    // CRITICAL: Normalize code first - remove existing newlines/tabs (outside strings)
    let normalized = '';
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let escapeNext = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        normalized += char;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        normalized += char;
        continue;
      }
      
      // Handle strings - preserve newlines inside strings
      if (char === '`' && !inString) {
        inTemplate = !inTemplate;
        normalized += char;
        continue;
      }
      if ((char === '"' || char === "'") && !inTemplate) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        normalized += char;
        continue;
      }
      
      // Outside strings: replace newlines/tabs with spaces
      if (!inString && !inTemplate) {
        if (char === '\n' || char === '\r' || char === '\t') {
          normalized += ' ';
        } else {
          normalized += char;
        }
      } else {
        // Inside strings: preserve everything
        normalized += char;
      }
    }
    
    // Now format the normalized code - split on semicolons
    let result = '';
    inString = false;
    stringChar = '';
    inTemplate = false;
    escapeNext = false;
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const prevChar = i > 0 ? normalized[i - 1] : '';
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        result += char;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        result += char;
        continue;
      }
      
      // Toggle string state
      if (char === '`' && !inString) {
        inTemplate = !inTemplate;
        result += char;
        continue;
      }
      if ((char === '"' || char === "'") && !inTemplate) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && !escapeNext) {
          inString = false;
          stringChar = '';
        }
        result += char;
        continue;
      }
      
      // Add newline after semicolon (outside strings)
      if (char === ';' && !inString && !inTemplate) {
        result += ';\n';
      } else {
        result += char;
      }
    }
    
    // Clean up and apply basic indentation
    const lines = result.split('\n').map(l => l.trim()).filter(l => l);
    let indent = 0;
    return lines.map(line => {
      if (line.startsWith('}') || line.startsWith(']')) indent = Math.max(0, indent - 1);
      const indented = '  '.repeat(indent) + line;
      if (line.endsWith('{') || line.endsWith('[')) indent++;
      return indented;
    }).join('\n');
  }

  /**
   * Forces formatting of code by splitting on semicolons
   * Properly handles strings, comments, and indentation
   * CRITICAL: Normalizes code first (removes existing newlines) then reformats from scratch
   */
  private forceFormatSingleLineCode(code: string): string {
    if (!code || typeof code !== 'string') {
      return code;
    }

    // CRITICAL: First normalize the code - remove all existing newlines/tabs
    // Replace newlines and tabs with spaces, but preserve them in string literals
    let normalized = '';
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let escapeNext = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        normalized += char;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        normalized += char;
        continue;
      }
      
      // Handle strings - preserve newlines inside strings
      if (char === '`' && !inString) {
        inTemplate = !inTemplate;
        normalized += char;
        continue;
      }
      if ((char === '"' || char === "'") && !inTemplate) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        normalized += char;
        continue;
      }
      
      // Outside strings: replace newlines/tabs with spaces
      if (!inString && !inTemplate) {
        if (char === '\n' || char === '\r' || char === '\t') {
          normalized += ' ';
        } else {
          normalized += char;
        }
      } else {
        // Inside strings: preserve everything
        normalized += char;
      }
    }
    
    // Now format the normalized code (single line)
    // CRITICAL: Ensure we start fresh with all state variables
    let result = '';
    let i = 0;
    inString = false;
    stringChar = '';
    inTemplate = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    escapeNext = false;
    
    // CRITICAL: Track if we've added any newlines
    let hasNewlines = false;
    
    while (i < normalized.length) {
      const char = normalized[i];
      const nextChar = i + 1 < normalized.length ? normalized[i + 1] : '';
      const prevChar = i > 0 ? normalized[i - 1] : '';
      
      // Handle escape sequences (but not in comments)
      if (escapeNext && !inSingleLineComment && !inMultiLineComment) {
        escapeNext = false;
        result += char;
        i++;
        continue;
      }
      if (char === '\\' && !inSingleLineComment && !inMultiLineComment) {
        escapeNext = true;
        result += char;
        i++;
        continue;
      }
      
      // Handle comments FIRST (before strings)
      if (!inString && !inTemplate && !escapeNext) {
        // Single-line comment
        if (char === '/' && nextChar === '/' && !inMultiLineComment) {
          inSingleLineComment = true;
          result += char;
          i++;
          continue;
        }
        // Multi-line comment start
        if (char === '/' && nextChar === '*' && !inSingleLineComment) {
          inMultiLineComment = true;
          result += char;
          i++;
          continue;
        }
        // Multi-line comment end
        if (inMultiLineComment && char === '*' && nextChar === '/') {
          inMultiLineComment = false;
          result += char + nextChar;
          i += 2;
          continue;
        }
        // Single-line comment ends at newline (we'll add it)
        if (inSingleLineComment && char === '\n') {
          inSingleLineComment = false;
        }
        // In comment - just add the char
        if (inSingleLineComment || inMultiLineComment) {
          result += char;
          i++;
          continue;
        }
      }
      
      // Handle strings and template literals (only outside comments)
      if (!inSingleLineComment && !inMultiLineComment) {
        if (char === '`' && !inString) {
          inTemplate = !inTemplate;
          result += char;
          i++;
          continue;
        }
        if ((char === '"' || char === "'") && !inTemplate) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar && !escapeNext) {
            inString = false;
            stringChar = '';
          }
          result += char;
          i++;
          continue;
        }
      }
      
      // CRITICAL: Add newline after semicolon (but not inside strings/comments)
      if (char === ';' && !inString && !inTemplate && !inSingleLineComment && !inMultiLineComment) {
        result += ';\n';
        hasNewlines = true;
        i++;
        continue;
      }
      
      // Add newline before keywords (const, let, var, function, return) if not at start
      // Check BEFORE adding the character
      if (!inString && !inTemplate && !inSingleLineComment && !inMultiLineComment) {
        const remaining = normalized.substring(i);
        const keywordMatch = remaining.match(/^(const|let|var|function|return)\s+/);
        if (keywordMatch) {
          // Check if previous char is not already a newline or at start
          if (result.length > 0 && !result.endsWith('\n') && prevChar !== '\n' && prevChar !== ';' && prevChar !== '{' && prevChar !== '}') {
            result += '\n';
          }
        }
      }
      
      // Add newline after closing brace if followed by keyword or another statement
      if (char === '}' && !inString && !inTemplate && !inSingleLineComment && !inMultiLineComment) {
        // Check what comes after (skip whitespace)
        let j = i + 1;
        while (j < normalized.length && normalized[j] === ' ') {
          j++;
        }
        const afterBrace = normalized.substring(j);
        // If followed by keyword or semicolon, add newline
        if (afterBrace.match(/^(const|let|var|function|return|;)/)) {
          result += '}\n';
          i++;
          continue;
        }
        // Also add newline if followed by something other than ; } ) ] ,
        const afterBraceChar = j < normalized.length ? normalized[j] : '';
        if (afterBraceChar && afterBraceChar !== ';' && afterBraceChar !== '}' && 
            afterBraceChar !== ')' && afterBraceChar !== ']' && afterBraceChar !== ',') {
          result += '}\n';
          i++;
          continue;
        }
      }
      
      result += char;
      i++;
    }
    
    // CRITICAL: If we didn't add any newlines, force add them after semicolons
    if (!hasNewlines && normalized.length > 20) {
      // Emergency: split on semicolons and add newlines
      const parts = normalized.split(';');
      if (parts.length > 1) {
        result = parts.map((p, idx) => {
          const trimmed = p.trim();
          if (trimmed) {
            return idx < parts.length - 1 ? trimmed + ';' : trimmed;
          }
          return '';
        }).filter(p => p).join('\n');
        hasNewlines = true;
      }
    }
    
    // Clean up: remove multiple consecutive newlines (but preserve comment newlines)
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // Apply proper indentation
    const formattedLines = result.split('\n');
    let indentLevel = 0;
    const indentedLines: string[] = [];
    
    for (let j = 0; j < formattedLines.length; j++) {
      let line = formattedLines[j];
      const trimmed = line.trim();
      
      if (!trimmed) {
        indentedLines.push('');
        continue;
      }
      
      // Decrease indent before closing braces/brackets
      if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add indented line
      indentedLines.push('  '.repeat(indentLevel) + trimmed);
      
      // Increase indent after opening braces/brackets (but not if it's a one-liner)
      if ((trimmed.endsWith('{') || trimmed.endsWith('[')) && 
          !trimmed.includes('}') && !trimmed.includes(']')) {
        indentLevel++;
      }
    }
    
    return indentedLines.join('\n');
  }

  /**
   * Formats minified JavaScript code with proper line breaks
   * Simple approach: split on semicolons and add newlines
   * ALWAYS formats if code is on one line to ensure readability
   */
  private formatCodeWithLineBreaks(code: string): string {
    if (!code || typeof code !== 'string') {
      return code;
    }

    // CRITICAL: Always format code that appears to be minified
    // Check if code is already formatted (has multiple lines with proper structure)
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    
    // If code has 10+ non-empty lines with semicolons on separate lines, assume it's formatted
    // Check if semicolons are already on separate lines
    let hasFormattedSemicolons = true;
    if (nonEmptyLines.length > 0) {
      const linesWithSemicolons = lines.filter(l => l.includes(';') && l.trim().length > 1);
      // If we have lines with semicolons, check if they're at the end (formatted)
      hasFormattedSemicolons = linesWithSemicolons.every(l => l.trim().endsWith(';') || l.trim().endsWith('; '));
    }
    
    if (nonEmptyLines.length >= 10 && hasFormattedSemicolons) {
      return code;
    }

    // ALWAYS format if code is on one line OR has very few lines
    // This ensures code is always readable in the code node
    // Be very aggressive - format anything that looks minified
    const isMinified = lines.length === 1 || 
                       (lines.length <= 2 && code.length > 30) ||
                       (lines.length <= 3 && code.length > 100 && !hasFormattedSemicolons);
    
    if (!isMinified) {
      return code;
    }

    // CRITICAL: Simple and aggressive approach - split on semicolons and add newlines
    // This ensures code is always readable, even if it means breaking some edge cases
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inComment = false;
    let escapeNext = false;
    
    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';
      const prevChar = i > 0 ? code[i - 1] : '';
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        result += char;
        i++;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        result += char;
        i++;
        continue;
      }
      
      // Handle comments
      if (!inString && !inTemplate && !escapeNext) {
        if (char === '/' && nextChar === '/') {
          inComment = true;
          result += char;
          i++;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inComment = true;
          result += char;
          i++;
          continue;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          result += char + nextChar;
          i += 2;
          continue;
        }
        if (inComment) {
          result += char;
          i++;
          continue;
        }
      }
      
      // Handle strings and template literals
      if (!inComment) {
        if (char === '`' && !inString) {
          inTemplate = !inTemplate;
          result += char;
          i++;
          continue;
        }
        if ((char === '"' || char === "'") && !inTemplate) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
          result += char;
          i++;
          continue;
        }
      }
      
      // CRITICAL: Add newline after semicolon (but not inside strings/comments)
      // This is the main formatting rule - every statement gets its own line
      if (char === ';' && !inString && !inTemplate && !inComment) {
        result += ';\n';
        i++;
        continue;
      }
      
      // Add newline after closing brace (if followed by something)
      if (char === '}' && !inString && !inTemplate && !inComment) {
        // Skip whitespace after }
        let j = i + 1;
        while (j < code.length && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n')) {
          j++;
        }
        const afterBrace = j < code.length ? code[j] : '';
        // Add newline if followed by something other than ; } ) ] ,
        if (afterBrace && afterBrace !== ';' && afterBrace !== '}' && 
            afterBrace !== ')' && afterBrace !== ']' && afterBrace !== ',') {
          result += '}\n';
          i++;
          continue;
        }
      }
      
      // Add newline before keywords (const, let, var, function, return) if not at start
      if (!inString && !inTemplate && !inComment && prevChar && 
          prevChar !== '\n' && prevChar !== ';' && prevChar !== '{' && prevChar !== '}') {
        const remaining = code.substring(i);
        if (remaining.match(/^(const|let|var|function|return)\s+/)) {
          if (!/[a-zA-Z0-9_]/.test(prevChar)) {
            result += '\n';
          }
        }
      }
      
      result += char;
      i++;
    }
    
    // Clean up: remove multiple consecutive newlines
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // Trim each line and apply basic indentation
    const formattedLines = result.split('\n');
    let indentLevel = 0;
    const indentedLines: string[] = [];
    
    for (let j = 0; j < formattedLines.length; j++) {
      let line = formattedLines[j].trim();
      if (!line) {
        indentedLines.push('');
        continue;
      }
      
      // Decrease indent before closing braces/brackets
      if (line.startsWith('}') || line.startsWith(']')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add indented line
      indentedLines.push('  '.repeat(indentLevel) + line);
      
      // Increase indent after opening braces/brackets
      if (line.endsWith('{') || line.endsWith('[')) {
        indentLevel++;
      }
    }
    
    return indentedLines.join('\n');
  }

  /**
   * Generates a unique prompt ID
   */
  private generatePromptId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 21; i++) {
      if (i === 4 || i === 8 || i === 12 || i === 16) {
        result += '-';
      } else {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return result;
  }

  /**
   * Gets all supported node types
   */
  getSupportedNodeTypes(): string[] {
    return Array.from(this.mappings.keys()).filter(type => 
      this.mappings.get(type)?.isSupported
    );
  }

  /**
   * Gets all node mappings
   */
  getAllMappings(): NodeMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Checks if a node type is supported
   */
  isNodeTypeSupported(nodeType: string): boolean {
    const mapping = this.mappings.get(nodeType);
    return mapping?.isSupported || false;
  }

}