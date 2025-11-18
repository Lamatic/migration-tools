# N8N to Lamatic Migration Tool

A production-ready Next.js application that converts n8n workflows to Lamatic format with intelligent node mapping, dependency analysis, and automated conversion.

## Features

- **File Upload**: Drag & drop n8n JSON files for instant conversion
- **Intelligent Node Mapping**: Deterministic mapping of 40+ n8n node types to Lamatic equivalents
- **Dependency Analysis**: Converts n8n connections to Lamatic dependency structure
- **Real-time Progress**: Live migration progress with detailed step tracking
- **Migration Reports**: Comprehensive analytics and conversion statistics
- **Error Handling**: Graceful error handling with detailed warnings and error messages

## Supported n8n Nodes

### Triggers (4)
- ✅ **Webhook Trigger** (`n8n-nodes-base.webhook`)
- ✅ **Manual Trigger** (`n8n-nodes-base.manualTrigger`)
- ✅ **Schedule Trigger** (`n8n-nodes-base.scheduleTrigger`)
- ✅ **Chat Trigger** (`@n8n/n8n-nodes-langchain.chatTrigger`)

### AI & LangChain (6)
- ✅ **Google Gemini Chat Model** (`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`)
- ✅ **OpenAI Chat Model** (`@n8n/n8n-nodes-langchain.lmChatOpenAi`)
- ✅ **Groq Chat Model** (`@n8n/n8n-nodes-langchain.lmChatGroq`)
- ✅ **Window Buffer Memory** (`@n8n/n8n-nodes-langchain.memoryBufferWindow`)
- ✅ **Memory Manager** (`@n8n/n8n-nodes-langchain.memoryManager`)
- ✅ **LangChain Agent** (`@n8n/n8n-nodes-langchain.agent`)

### Database & Tools (3)
- ✅ **PostgreSQL Tool** (`n8n-nodes-base.postgresTool`)
- ✅ **Supabase** (`n8n-nodes-base.supabase`)
- ✅ **Airtable** (`n8n-nodes-base.airtable`)

### Integrations (9)
- ✅ **Slack** (`n8n-nodes-base.slack`)
- ✅ **Gmail** (`n8n-nodes-base.gmail`)
- ✅ **Google Sheets** (`n8n-nodes-base.googleSheets`)
- ✅ **Google Drive** (`n8n-nodes-base.googleDrive`)
- ✅ **Microsoft Teams** (`n8n-nodes-base.microsoftTeams`)
- ✅ **Notion** (`n8n-nodes-base.notion`)
- ✅ **HTTP Request** (`n8n-nodes-base.httpRequest`)
- ✅ **Code Node** (`n8n-nodes-base.code`)
- ✅ **Wikipedia Tool** (`@n8n/n8n-nodes-langchain.toolWikipedia`)

### Control Flow (3)
- ✅ **If Node** (`n8n-nodes-base.if`)
- ✅ **Switch Node** (`n8n-nodes-base.switch`)
- ✅ **Filter Node** (`n8n-nodes-base.filter`)

### Data Processing (5)
- ✅ **Set Data** (`n8n-nodes-base.set`)
- ✅ **Merge** (`n8n-nodes-base.merge`)
- ✅ **Aggregate** (`n8n-nodes-base.aggregate`)
- ✅ **Limit** (`n8n-nodes-base.limit`)
- ✅ **Execution Data** (`n8n-nodes-base.executionData`)

### Workflow Management (3)
- ✅ **Execute Workflow** (`n8n-nodes-base.executeWorkflow`)
- ✅ **Execute Workflow Trigger** (`n8n-nodes-base.executeWorkflowTrigger`)
- ✅ **Form Trigger** (`n8n-nodes-base.formTrigger`)

### File Operations (3)
- ✅ **Read/Write File** (`n8n-nodes-base.readWriteFile`)
- ✅ **Compression** (`n8n-nodes-base.compression`)
- ✅ **Edit Image** (`n8n-nodes-base.editImage`)

## Project Structure

```
n8n-migration/
├── app/                    # Next.js application routes
│   ├── api/               # API endpoints
│   │   └── migrate/       # Migration API endpoint
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── theme-provider.tsx # Theme context provider
│   └── theme-toggle.tsx   # Theme toggle component
├── lib/                   # Core library code
│   ├── migration/         # Migration engine
│   │   ├── parser.ts      # n8n workflow parser
│   │   ├── mapper.ts      # Node type mapper
│   │   ├── dependencies.ts # Dependency builder
│   │   ├── generator.ts   # Lamatic workflow generator
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── schemas.ts     # Lamatic node schemas
│   │   └── schemaValidator.ts # Schema validation
│   └── lamatic-client.ts  # Lamatic API client
├── actions/               # Server actions
│   └── orchestrate.ts    # Main migration orchestration
├── package.json          # Dependencies and scripts
├── next.config.mjs        # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Core Components

### Parser (`lib/migration/parser.ts`)
Extracts and validates n8n workflow structure from JSON. Handles node normalization, connection parsing, and workflow validation.

### Mapper (`lib/migration/mapper.ts`)
Converts n8n node types to Lamatic equivalents with parameter and credential mappings. Supports 40+ node types with intelligent parameter transformation.

### Dependency Builder (`lib/migration/dependencies.ts`)
Builds workflow dependency structure from n8n connections. Handles special AI connection types (`ai_tool`, `ai_memory`, `ai_languageModel`) and calculates execution order.

### Generator (`lib/migration/generator.ts`)
Creates final Lamatic workflow JSON with proper structure, connections, and metadata. Validates node references and formats output.

### Orchestrator (`actions/orchestrate.ts`)
Main migration pipeline that coordinates parsing, mapping, dependency building, and generation. Handles error recovery and progress tracking.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Usage

1. **Upload n8n Workflow**
   - Drag & drop your n8n JSON file
   - Or click to browse and select a file

2. **Processing**
   - Watch real-time progress as the file is processed
   - See detailed migration steps and status

3. **Results**
   - Review the migration report with node-by-node details
   - Check for any warnings or errors
   - Download the converted Lamatic workflow

## Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Lamatic API Configuration (optional)
LAMATIC_API_KEY=your_lamatic_api_key
LAMATIC_ENDPOINT=https://api.lamatic.ai
LAMATIC_PROJECT_ID=migration-tool

# Migration Settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
NODE_ENV=development
```

### API Configuration

1. **Get Lamatic Credentials**
   - Sign up at [lamatic.ai](https://lamatic.ai)
   - Create a project
   - Generate API key

2. **Configure Settings**
   - Add your API key to `.env.local`
   - Test the connection

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your repository

3. **Configure Environment Variables**
   - Add all variables from `env.example`
   - Set `NODE_ENV=production`
   - Add your `LAMATIC_API_KEY` (if using)

4. **Deploy**
   - Click "Deploy"
   - Your app will be live in minutes

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add LAMATIC_API_KEY
vercel env add LAMATIC_ENDPOINT

# Deploy to production
vercel --prod
```

### Other Platforms

This is a standard Next.js application and can be deployed to:
- **Vercel** (Recommended) - Zero-config deployment
- **Netlify** - Similar to Vercel
- **AWS Amplify** - AWS hosting
- **Railway** - Simple container deployment
- **Docker** - Container-based deployment

## Development

### Adding New Node Mappings

1. **Update mapping engine** (`lib/migration/mapper.ts`)
   ```typescript
   this.addMapping({
     n8nType: 'n8n-nodes-base.newNode',
     lamaticType: 'lamatic_equivalent',
     isSupported: true,
     parameterMappings: [
       { n8nParameter: 'param1', lamaticParameter: 'param1', required: true }
     ],
     credentialMappings: [
       { n8nCredential: 'cred1', lamaticCredential: 'cred1', requiresReauth: true }
     ],
     notes: 'Description of the mapping'
   });
   ```

2. **Add node creation logic** in `createLamaticNode()` method
3. **Update schemas** (`lib/migration/schemas.ts`) if needed
4. **Test with your own n8n workflow**

### Architecture

The migration system follows a modular pipeline:

```
File Upload → Parser → Mapper → Dependency Builder → Generator → Output
```

Each component is independently testable and handles specific responsibilities:
- **Parser**: Validates and normalizes n8n structure
- **Mapper**: Converts node types and parameters
- **Dependency Builder**: Resolves connections and execution order
- **Generator**: Creates final Lamatic JSON structure

## Troubleshooting

### Common Issues

1. **"Invalid n8n workflow"**
   - Ensure file is valid JSON
   - Check n8n workflow structure
   - Verify file isn't corrupted

2. **"File size exceeds limit"**
   - Reduce file size (max 10MB)
   - Remove unnecessary nodes
   - Compress the JSON file

3. **"Migration failed"**
   - Check migration report for details
   - Verify n8n workflow is valid
   - Try with simpler workflow first

4. **"No trigger node found"**
   - Ensure workflow contains a valid trigger node
   - Supported triggers: webhook, manual, schedule, chatTrigger

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

Check browser console for detailed error messages.

## API Reference

### Migration Pipeline

```typescript
import { processMigration } from '@/actions/orchestrate';

const result = await processMigration(file);
// Returns: MigrationResult with success status, nodes, and workflow
```

### Individual Components

```typescript
// Parse n8n workflow
import { N8nParser } from '@/lib/migration/parser';
const parser = new N8nParser();
const workflow = parser.parseWorkflow(jsonContent);

// Map nodes to Lamatic
import { NodeMapper } from '@/lib/migration/mapper';
const mapper = new NodeMapper();
const result = mapper.mapNode(n8nNode, nodeId);

// Build dependencies
import { DependencyBuilder } from '@/lib/migration/dependencies';
const builder = new DependencyBuilder();
const deps = builder.buildDependencies(workflow, nodes);

// Generate Lamatic workflow
import { LamaticOutputGenerator } from '@/lib/migration/generator';
const generator = new LamaticOutputGenerator();
const lamaticWorkflow = generator.generateWorkflow(nodes, workflow, metadata, connections);
```

## License

This project is licensed under the MIT License.

## Support

### Getting Help

1. **Check Documentation**
   - Code comments and type definitions
   - Component documentation

2. **Test Your Workflow**
   - Upload your own n8n workflow JSON file
   - Verify the migration works correctly

### Resources

- [Lamatic Documentation](https://lamatic.ai/docs)
- [n8n Documentation](https://docs.n8n.io/)

---

**Happy Migrating! 🚀**
