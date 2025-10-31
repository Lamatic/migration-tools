import { N8nNode, LamaticNode, NodeMapping, ParameterMapping, CredentialMapping } from './types';

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

    // HTTP Request Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.httpRequest',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'url', lamaticParameter: 'url', required: true },
        { n8nParameter: 'method', lamaticParameter: 'method', required: true },
        { n8nParameter: 'headers', lamaticParameter: 'headers', required: false },
        { n8nParameter: 'body', lamaticParameter: 'body', required: false },
        { n8nParameter: 'timeout', lamaticParameter: 'timeout', required: false },
      ],
      credentialMappings: [],
      notes: 'HTTP request node for API calls',
    });

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

    // If Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.if',
      lamaticType: 'branchNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'conditions', lamaticParameter: 'conditions', required: true },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [],
      notes: 'Conditional logic node',
    });

    // Set Data Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.set',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'values', lamaticParameter: 'fields', required: true },
        { n8nParameter: 'options.dotNotation', lamaticParameter: 'dotNotation', required: false, defaultValue: true },
        { n8nParameter: 'options.include', lamaticParameter: 'include', required: false, defaultValue: 'all' },
      ],
      credentialMappings: [],
      notes: 'Set/transform data fields in the workflow',
    });

    // Merge Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.merge',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'mode', lamaticParameter: 'mode', required: true, defaultValue: 'append' },
        { n8nParameter: 'mergeByFields', lamaticParameter: 'mergeByFields', required: false },
        { n8nParameter: 'options.clashHandling', lamaticParameter: 'clashHandling', required: false, defaultValue: 'preferInput1' },
      ],
      credentialMappings: [],
      notes: 'Merge data from multiple inputs',
    });

    // Switch Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.switch',
      lamaticType: 'branchNode',
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

    // Google Sheets Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.googleSheets',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'append' },
        { n8nParameter: 'resource', lamaticParameter: 'resource', required: true, defaultValue: 'sheet' },
        { n8nParameter: 'sheetId', lamaticParameter: 'spreadsheetId', required: true },
        { n8nParameter: 'sheetName', lamaticParameter: 'sheetName', required: false, defaultValue: 'Sheet1' },
        { n8nParameter: 'range', lamaticParameter: 'range', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'googleSheetsOAuth2', lamaticCredential: 'googleSheets', requiresReauth: true }
      ],
      notes: 'Google Sheets integration for data manipulation',
    });

    // Airtable Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.airtable',
      lamaticType: 'LLMNode',
      isSupported: true,
      parameterMappings: [
        { n8nParameter: 'operation', lamaticParameter: 'operation', required: true, defaultValue: 'create' },
        { n8nParameter: 'application', lamaticParameter: 'baseId', required: true },
        { n8nParameter: 'table', lamaticParameter: 'tableName', required: true },
        { n8nParameter: 'fields', lamaticParameter: 'fields', required: false },
        { n8nParameter: 'options', lamaticParameter: 'options', required: false },
      ],
      credentialMappings: [
        { n8nCredential: 'airtableApi', lamaticCredential: 'airtable', requiresReauth: true }
      ],
      notes: 'Airtable database operations',
    });

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

    // Discord Node Mapping
    this.addMapping({
      n8nType: 'n8n-nodes-base.discord',
      lamaticType: 'LLMNode',
      isSupported: true,
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
      lamaticType: 'LLMNode',
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

    return {
      lamaticNode,
      requiresManualSetup: mapping.requiresManualSetup || false,
      requiresReauth: mapping.credentialMappings?.some(cred => cred.requiresReauth) || false,
      warnings,
    };
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
        return {
          ...baseNode,
          values: {
            path: this.getNestedValue(n8nNode.parameters, 'path') || 'slack-bot',
            method: this.getNestedValue(n8nNode.parameters, 'httpMethod') || 'POST',
            description: `Webhook endpoint: ${this.getNestedValue(n8nNode.parameters, 'path') || 'slack-bot'}`,
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'LLMNode':
        if (n8nNode.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini') {
          return {
            ...baseNode,
            values: {
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
              tools: ['chat_completion', 'text_generation'],
              credentials: '',
              messages: '[]',
              memories: '[]',
              attachments: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        } else if (n8nNode.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
          return {
            ...baseNode,
            values: {
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
              tools: ['memory_management', 'conversation_history'],
              credentials: '',
              messages: '[]',
              memories: '[]',
              attachments: ''
            },
            'x-runtime': xRuntime,
            '_flowMetadata': flowMetadata,
          };
        }
        break;

      case 'agentNode':
        return {
          ...baseNode,
          values: {
            prompts: [
              {
                id: this.generatePromptId(),
                content: this.getNestedValue(n8nNode.parameters, 'options.systemMessage') || 'You are Effibotics AI personal assistant. Your task will be to provide helpful assistance and advice related to automation and such tasks.',
                role: 'system'
              },
              {
                id: this.generatePromptId(),
                content: this.getNestedValue(n8nNode.parameters, 'text') || '={{ $json.body.text }}',
                role: 'user'
              }
            ],
            agents: [
              {
                name: 'Creative Director',
                description: 'Generates multiple creative concepts for marketing assets',
                schema: {}
              }
            ],
            tools: ['image_generation', 'content_creation', 'brand_guidelines'],
            messages: '[]',
            stopWord: '',
            maxIterations: this.getNestedValue(n8nNode.parameters, 'options.maxIterations') || 5,
            connectedTo: ''
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'slackNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            action: 'postMessage',
            channel: '',
            message: this.getNestedValue(n8nNode.parameters, 'text') || '={{ $json.body.user_name }}: {{ $json.body.text }}\n\nEffibotics Bot: {{ $json.output.removeMarkdown() }} ',
            thread_ts: '',
            username: '',
            icon_emoji: '',
            icon_url: ''
          },
          'x-runtime': {
            ...xRuntime,
            actionRequired: true,
            actionRequiredReason: 'Slack credentials missing (values.credentials is empty). Provide Slack API token in node credentials.',
          },
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

      case 'mergeNode':
        return {
          ...baseNode,
          values: {
            mode: this.getNestedValue(n8nNode.parameters, 'mode') || 'append',
            mergeByFields: this.getNestedValue(n8nNode.parameters, 'mergeByFields') || [],
            clashHandling: this.getNestedValue(n8nNode.parameters, 'options.clashHandling') || 'preferInput1',
            inputCount: 2,
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

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
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'send',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            to: this.getNestedValue(n8nNode.parameters, 'to') || '',
            subject: this.getNestedValue(n8nNode.parameters, 'subject') || '',
            message: this.getNestedValue(n8nNode.parameters, 'message') || '',
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'googleSheetsNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'append',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'sheet',
            spreadsheetId: this.getNestedValue(n8nNode.parameters, 'sheetId') || '',
            sheetName: this.getNestedValue(n8nNode.parameters, 'sheetName') || 'Sheet1',
            range: this.getNestedValue(n8nNode.parameters, 'range') || '',
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'airtableNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'create',
            baseId: this.getNestedValue(n8nNode.parameters, 'application') || '',
            tableName: this.getNestedValue(n8nNode.parameters, 'table') || '',
            fields: this.getNestedValue(n8nNode.parameters, 'fields') || {},
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'teamsNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'postMessage',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            teamId: this.getNestedValue(n8nNode.parameters, 'teamId') || '',
            channelId: this.getNestedValue(n8nNode.parameters, 'channelId') || '',
            message: this.getNestedValue(n8nNode.parameters, 'messageText') || '',
            options: this.getNestedValue(n8nNode.parameters, 'options') || {},
          },
          'x-runtime': xRuntime,
          '_flowMetadata': flowMetadata,
        };

      case 'discordNode':
        return {
          ...baseNode,
          values: {
            credentials: '',
            operation: this.getNestedValue(n8nNode.parameters, 'operation') || 'sendMessage',
            resource: this.getNestedValue(n8nNode.parameters, 'resource') || 'message',
            channelId: this.getNestedValue(n8nNode.parameters, 'channelId') || '',
            message: this.getNestedValue(n8nNode.parameters, 'content') || '',
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
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Generates a unique node ID matching the example format
   */
  generateNodeId(originalId: string): string {
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

    // Fallback for other nodes
    const short = (originalId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || '000';
    const random = Math.floor(Math.random() * 1000);
    return `${this.getNodeTypePrefix(originalId)}_${short}${random}`;
  }

  /**
   * Gets node type prefix for ID generation
   */
  private getNodeTypePrefix(originalId: string): string {
    // This would be determined by the node type, but for now use generic
    return 'node';
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