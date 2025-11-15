# N8N to Lamatic Serverless Migration Tool

A production-ready migration tool that converts N8N workflows to Lamatic format with intelligent node mapping, dependency analysis, and seamless user experience.

## 🚀 Features

### Core Migration Capabilities
- **File Upload**: Drag & drop n8n JSON files for instant conversion
- **Intelligent Node Mapping**: Deterministic mapping of n8n nodes to Lamatic equivalents
- **Dependency Analysis**: Converts n8n connections to Lamatic dependency structure
- **Real-time Progress**: Live migration progress with detailed step tracking
- **Migration Reports**: Comprehensive analytics and conversion statistics

### User Experience
- **Lamatic-Inspired Design**: Clean, modern interface with red accents and dark/light mode
- **Dual-Path Interface**: Choose between file upload or API import (coming soon)
- **Drag & Drop**: Easy file upload with visual feedback
- **Error Handling**: Graceful error handling with helpful error messages
- **Download Results**: One-click download of converted Lamatic workflows

## 📋 Supported n8n Nodes

**Total: 19 Node Types**

### Triggers (3)
- ✅ **Webhook Trigger** (`n8n-nodes-base.webhook`) - HTTP webhook endpoints
- ✅ **Manual Trigger** (`n8n-nodes-base.manualTrigger`) - Manual workflow execution
- ✅ **Schedule Trigger** (`n8n-nodes-base.scheduleTrigger`) - Time-based automation

### AI & LangChain (3)
- ✅ **Google Gemini Chat Model** (`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`) - LLM integration
- ✅ **Window Buffer Memory** (`@n8n/n8n-nodes-langchain.memoryBufferWindow`) - Conversation memory
- ✅ **LangChain Agent** (`@n8n/n8n-nodes-langchain.agent`) - AI agent orchestration

### Integrations (9)
- ✅ **Slack** (`n8n-nodes-base.slack`) - Slack messaging
- ✅ **Gmail** (`n8n-nodes-base.gmail`) - Email sending and management
- ✅ **Google Sheets** (`n8n-nodes-base.googleSheets`) - Spreadsheet operations
- ✅ **Airtable** (`n8n-nodes-base.airtable`) - Database operations
- ✅ **Microsoft Teams** (`n8n-nodes-base.microsoftTeams`) - Team collaboration
- ✅ **Discord** (`n8n-nodes-base.discord`) - Bot messaging
- ✅ **Notion** (`n8n-nodes-base.notion`) - Workspace management
- ✅ **HTTP Request** (`n8n-nodes-base.httpRequest`) - API calls
- ✅ **Code Node** (`n8n-nodes-base.code`) - Custom JavaScript execution

### Control Flow (2)
- ✅ **If Node** (`n8n-nodes-base.if`) - Conditional logic
- ✅ **Switch Node** (`n8n-nodes-base.switch`) - Multi-path routing

### Data Processing (2)
- ✅ **Set Data** (`n8n-nodes-base.set`) - Transform/set data fields
- ✅ **Merge** (`n8n-nodes-base.merge`) - Combine multiple data sources

## 🏗️ Architecture

The migration system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload   │───▶│     Parser      │───▶│ Mapping Engine  │
│     Layer       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Generator     │◀───│ Dependencies    │◀───│   Validator     │
│                 │    │   Builder       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **Parser** (`lib/migration/parser.ts`) - Extracts nodes and connections from n8n JSON
2. **Mapper** (`lib/migration/mapper.ts`) - Converts n8n nodes to Lamatic equivalents
3. **Dependency Builder** (`lib/migration/dependencies.ts`) - Builds workflow dependencies
4. **Generator** (`lib/migration/generator.ts`) - Creates final Lamatic JSON
5. **Orchestrator** (`actions/orchestrate.ts`) - Main migration pipeline

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Navigate to the migration tool**
   ```bash
   cd templates/embed/n8n-migration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📖 Usage

### File Upload Path

1. **Upload n8n Workflow**
   - Click "Upload File" on the main page
   - Drag & drop your n8n JSON file
   - Or click to browse and select a file

2. **Processing**
   - Watch real-time progress as the file is processed
   - See detailed migration steps and status

3. **Results**
   - Review the migration report with node-by-node details
   - Check for any warnings or errors
   - Download the converted Lamatic workflow

### API Import Path (Coming Soon)

1. **Connect to n8n Instance**
   - Enter your n8n instance URL
   - Provide API key for authentication
   - Test the connection

2. **Select Workflows**
   - Browse available workflows
   - Select which ones to migrate
   - Configure migration options

3. **Batch Import**
   - Process multiple workflows at once
   - Get comprehensive migration reports
   - Download all converted workflows

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Lamatic API Configuration
LAMATIC_API_KEY=your_lamatic_api_key
LAMATIC_ENDPOINT=https://api.lamatic.ai
LAMATIC_PROJECT_ID=migration-tool

# Migration Settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
SUPPORTED_FILE_TYPES=.json
```

### API Configuration

1. **Get Lamatic Credentials**
   - Sign up at [lamatic.ai](https://lamatic.ai)
   - Create a project
   - Generate API key

2. **Configure Settings**
   - Add your API key to environment variables
   - Test the connection

## 🚀 Deployment

### Deploy to Vercel

The easiest way to deploy this application is using Vercel:

> ✅ **Private repositories work perfectly!** When you connect GitHub to Vercel, you'll authorize access to your private repo. No code changes needed.

#### Quick Deploy (Recommended)

1. **Push to GitHub** (private repo is fine!)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - **First time?** Authorize Vercel to access your repositories (select your private repo)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set root directory to `templates/embed/n8n-migration` (if deploying from repo root)

3. **Configure Environment Variables**
   - Add all variables from `env.example`
   - Set `NODE_ENV=production`
   - Add your `LAMATIC_API_KEY`
   - Set `LAMATIC_PROJECT_ID` (default: `migration-tool`)

4. **Deploy**
   - Click "Deploy"
   - Your app will be live in minutes!

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project
cd templates/embed/n8n-migration

# Deploy
vercel

# Set environment variables
vercel env add LAMATIC_API_KEY
vercel env add LAMATIC_ENDPOINT
# ... add other variables

# Deploy to production
vercel --prod
```

📖 **For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Other Platforms

This is a standard Next.js application and can be deployed to:
- **Vercel** (Recommended) - Zero-config deployment
- **Netlify** - Similar to Vercel
- **AWS Amplify** - AWS hosting
- **Railway** - Simple container deployment
- **Docker** - Container-based deployment

## 🧪 Testing

### Test with Sample Workflow

The repository includes a sample n8n workflow for testing:

```bash
# Sample workflow location
public/sample-n8n-workflow.json
```

### Test Migration Flow

1. **Upload Sample Workflow**
   - Use the provided sample workflow
   - Test the complete migration process

2. **Verify Conversion**
   - Check node mappings
   - Validate dependencies
   - Review generated Lamatic workflow

## 🎨 Design System

### Lamatic Brand Colors
- **Primary Red**: `#FF3B30` (Lamatic brand red)
- **Dark Mode**: `#1a1a1a` (dark header)
- **Light Mode**: `#ffffff` (clean white)
- **Accent Yellow**: `#FFD700` (top-left highlight)

### UI Components
- **Compliance Badge**: SOC2 & GDPR compliant indicator
- **Primary Buttons**: Red accent with rounded corners
- **Secondary Buttons**: Outlined with hover effects
- **Grid Background**: Subtle pattern for visual depth

## 🚨 Troubleshooting

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

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

Check browser console for detailed error messages.

## 📚 API Reference

### Migration Pipeline

```typescript
import { migrationPipeline } from '@/actions/orchestrate';

const result = await migrationPipeline.process(file);
```

### Individual Components

```typescript
// Parse n8n workflow
import { N8nParser } from '@/lib/migration/parser';

// Map nodes to Lamatic
import { NodeMapper } from '@/lib/migration/mapper';

// Build dependencies
import { DependencyBuilder } from '@/lib/migration/dependencies';

// Generate Lamatic workflow
import { LamaticOutputGenerator } from '@/lib/migration/generator';
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/new-node-mapping
   ```
3. **Make changes**
4. **Test thoroughly**
5. **Submit pull request**

### Adding New Node Mappings

1. **Update mapping engine**
   ```typescript
   // lib/migration/mapper.ts
   this.addMapping({
     n8nType: 'n8n-nodes-base.newNode',
     lamaticType: 'lamatic_equivalent',
     isSupported: true,
     parameterMappings: [...],
     credentialMappings: [...]
   });
   ```

2. **Add parameter mappings**
3. **Update schemas**
4. **Test with sample workflow**
5. **Update documentation**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

### Getting Help

1. **Check Documentation**
   - This README
   - Code comments and type definitions

2. **Test with Sample**
   - Use provided sample workflow
   - Verify basic functionality

3. **Check Issues**
   - Look for similar issues
   - Create new issue if needed

### Resources

- [Lamatic Documentation](https://lamatic.ai/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [AgentKit Repository](https://github.com/Lamatic/AgentKit)

---

**Happy Migrating! 🚀**

This migration tool makes it easy to move your n8n workflows to Lamatic while maintaining functionality and providing a smooth user experience.
