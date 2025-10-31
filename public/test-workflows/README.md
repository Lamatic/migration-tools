# Test Workflows
## n8n to Lamatic Migration Tool - Test Suite

This folder contains 10 comprehensive test workflows designed to validate all 19 supported node types and edge cases.

---

## 📁 Test Files

### Simple Workflows
- **01-simple-webhook-slack.json** - Basic webhook to Slack notification
  - Nodes: 2 (Webhook → Slack)
  - Tests: Basic integration, credentials
  
- **07-edge-case-minimal.json** - Minimal 2-node workflow
  - Nodes: 2 (Manual → Set)
  - Tests: Minimal configuration

### Basic Workflows
- **02-schedule-email-automation.json** - Scheduled email reports
  - Nodes: 4 (Schedule → Sheets → Set → Gmail)
  - Tests: Multiple OAuth2 credentials, data transformation

### Intermediate Workflows
- **03-conditional-routing-if-switch.json** - Customer tier routing
  - Nodes: 7 (Webhook → If → Switch → Multi-channel notifications)
  - Tests: Conditional logic, branching, multiple integrations
  
- **04-merge-multi-source-data.json** - Data aggregation from multiple sources
  - Nodes: 6 (Manual → [Airtable, Sheets] → Merge → Set → Notion)
  - Tests: Parallel execution, merge logic, data normalization

### Advanced Workflows
- **05-ai-chatbot-slack.json** - AI-powered Slack chatbot
  - Nodes: 7 (Webhook → Code → [Memory, Gemini] → Agent → Set → Slack)
  - Tests: LangChain integration, AI connections, complex code
  
- **06-complex-http-code-transform.json** - API integration with processing
  - Nodes: 6 (Schedule → HTTP → Code → Switch → [HTTP, Set])
  - Tests: HTTP requests, complex JavaScript, routing

### Edge Cases
- **08-edge-case-no-connections.json** - Isolated nodes with no connections
  - Nodes: 3 (Webhook, Slack, Set - all isolated)
  - Tests: Handling disconnected nodes
  
- **09-edge-case-deeply-nested.json** - Deep parameter nesting
  - Nodes: 3 (Webhook → Set → Code)
  - Tests: Dot notation, deeply nested objects, complex transformations

### Comprehensive
- **10-ultimate-comprehensive.json** - All 19 node types in one workflow
  - Nodes: 22 (uses all 19 node types)
  - Tests: Complete integration, all features, complex routing

---

## 🧪 How to Use These Tests

### Via UI (Recommended)
1. Open the n8n to Lamatic migration tool
2. Upload any test file
3. Review the conversion results
4. Compare with expected output in TESTING.md

### Via API
```bash
curl -X POST http://localhost:3000/api/migrate \
  -F "file=@01-simple-webhook-slack.json"
```

### Via Code
```javascript
import { processMigration } from '../actions/orchestrate';

const file = await fetch('/test-workflows/01-simple-webhook-slack.json')
  .then(r => r.text());

const result = await processMigration(file);
console.log(result);
```

---

## 📊 Node Coverage

All 19 supported nodes are tested:

| Node Type | Test Files |
|-----------|------------|
| Webhook Trigger | 01, 03, 05, 08, 09, 10 |
| Manual Trigger | 04, 07, 10 |
| Schedule Trigger | 02, 06, 10 |
| Google Gemini | 05, 10 |
| Window Buffer Memory | 05, 10 |
| LangChain Agent | 05, 10 |
| Slack | 01, 03, 05, 08, 10 |
| HTTP Request | 06, 10 |
| Code Node | 05, 06, 09, 10 |
| If Node | 03, 10 |
| Switch Node | 03, 06, 10 |
| Set Data | 02, 03, 04, 06, 07, 08, 09, 10 |
| Merge | 04, 10 |
| Gmail | 02, 10 |
| Google Sheets | 02, 04, 10 |
| Airtable | 04, 10 |
| Microsoft Teams | 03, 10 |
| Discord | 03, 10 |
| Notion | 04, 10 |

**Coverage:** 100% (19/19) ✅

---

## ✅ Expected Results

### Success Criteria
All test workflows should:
- ✅ Convert without errors
- ✅ Preserve all parameters
- ✅ Maintain correct dependencies
- ✅ Generate valid Lamatic workflows
- ⚠️  Show warnings for credentials (expected)

### Common Warnings (Expected)
- Slack credentials require re-authentication
- Google services (Gmail, Sheets, Gemini) require OAuth2
- Microsoft Teams requires OAuth2
- Discord requires bot token
- Airtable requires API key
- Notion requires integration token

---

## 📚 Documentation

For detailed test results and analysis, see:
- [TESTING.md](../../docs/TESTING.md) - Complete test documentation
- [MIGRATION_NODES.md](../../docs/MIGRATION_NODES.md) - Node reference
- [USER_GUIDE.md](../../docs/new-flow/USER_GUIDE.md) - User guide

---

## 🚀 Quick Test

Run the simplest test first:
```bash
# Test 07 - Minimal workflow (fastest)
curl -X POST http://localhost:3000/api/migrate \
  -F "file=@07-edge-case-minimal.json"
```

Then try the comprehensive test:
```bash
# Test 10 - All nodes (most comprehensive)
curl -X POST http://localhost:3000/api/migrate \
  -F "file=@10-ultimate-comprehensive.json"
```

---

**Last Updated:** October 27, 2025  
**Version:** 1.0




