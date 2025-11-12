"use client";

import { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Check, AlertCircle, XCircle, ArrowRight, FileText, Github, ExternalLink, Database, Zap, Workflow, Sparkles, ArrowUpRight, X, Clock, Activity, FileDown, CheckCircle2, Star, Quote } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// PDF generation helper - Minimalist, clean design
// Generate Markdown report for Notion users
const generateMarkdownReport = (result: any, originalFileName?: string): string => {
  const workflowName = result.lamaticWorkflow?.name || 'Workflow';
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  const successRate = result.totalNodes > 0 ? Math.round((result.convertedNodes / result.totalNodes) * 100) : 0;
  
  let markdown = `# 📊 n8n to Lamatic Migration Report\n\n`;
  markdown += `**Workflow:** ${workflowName}\n`;
  markdown += `**Migration Date:** ${date} at ${time}\n`;
  markdown += `**Processing Time:** ${Math.round((result.processingTime || 0) / 1000)} seconds\n\n`;
  markdown += `---\n\n`;
  
  // Migration Summary
  markdown += `## 📋 Migration Summary\n\n`;
  markdown += `| Field | Value |\n`;
  markdown += `|-------|-------|\n`;
  markdown += `| **Workflow Name** | ${workflowName} |\n`;
  markdown += `| **Processing Time** | ${Math.round((result.processingTime || 0) / 1000)} seconds |\n`;
  markdown += `| **Completed** | ${new Date().toLocaleString()} |\n`;
  markdown += `| **Success Rate** | ${successRate}% |\n\n`;
  markdown += `> All ${result.totalNodes} automation nodes from your n8n workflow have been converted to Lamatic format. Your workflow logic, connections, and automation flows are ready to use in Lamatic.\n\n`;
  markdown += `---\n\n`;
  
  // Migration Statistics
  markdown += `## 📊 Migration Statistics\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| **Total Nodes** | ${result.totalNodes} |\n`;
  markdown += `| **✅ Converted** | ${result.convertedNodes} |\n`;
  markdown += `| **⚠️ Need Setup** | ${result.warningNodes || 0} |\n`;
  markdown += `| **❌ Errors** | ${result.errorNodes || 0} |\n\n`;
  markdown += `---\n\n`;
  
  // What's Next - Simplified
  markdown += `## 🚀 What's Next?\n\n`;
  markdown += `Follow these steps to complete your workflow migration:\n\n`;
  
  markdown += `### Step 1: Open Lamatic Studio\n`;
  markdown += `Navigate to [studio.lamatic.ai](https://studio.lamatic.ai) in your browser\n\n`;
  
  markdown += `### Step 2: Import Your Workflow\n`;
  markdown += `**Copy-Paste Method (Easiest):**\n`;
  markdown += `1. Open your downloaded file in any text editor\n`;
  markdown += `2. Select all content (Ctrl+A or Cmd+A) and copy\n`;
  markdown += `3. In Lamatic Studio, open a flow or create a new one, then click the **"Config"** toggle (top-right)\n`;
  markdown += `4. Paste the JSON content into the editor\n`;
  markdown += `5. Put in your API keys and credentials\n`;
  markdown += `6. Done! Your workflow is now imported ✅\n\n`;
  
  markdown += `---\n\n`;
  
  // Complete Setup Guide (for detailed report)
  markdown += `## 📋 Complete Setup Guide\n\n`;
  markdown += `For detailed setup instructions including testing and deployment, see the sections below.\n\n`;
  
  // Credentials if needed
  if (result.warningNodes > 0) {
    markdown += `### Step 3: ⛔ MUST FIX - Configure Credentials\n\n`;
    markdown += `Your workflow won't run until these are configured:\n\n`;
    
    const credentialNodes = result.nodeResults?.filter((n: any) => 
      n.n8nNodeType?.includes('slack') || 
      n.n8nNodeType?.includes('gemini') ||
      n.message?.toLowerCase().includes('credential')
    );
    
    if (credentialNodes && credentialNodes.length > 0) {
      credentialNodes.forEach((node: any) => {
        const isSlack = node.n8nNodeType?.includes('slack');
        const isGemini = node.n8nNodeType?.includes('gemini');
        
        if (isSlack) {
          markdown += `#### 💬 Slack Setup\n`;
          markdown += `1. Visit [api.slack.com/apps](https://api.slack.com/apps)\n`;
          markdown += `2. Create app → OAuth & Permissions\n`;
          markdown += `3. Copy "Bot User OAuth Token"\n`;
          markdown += `4. In Lamatic: Click Slack node → Configure Credentials → Paste token\n`;
          markdown += `5. Required permissions: \`chat:write\`, \`channels:read\`\n`;
          markdown += `⏱️ Time: 3-5 minutes\n\n`;
        }
        
        if (isGemini) {
          markdown += `#### 🤖 Google Gemini Setup\n`;
          markdown += `1. Visit [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)\n`;
          markdown += `2. Click "Create API Key"\n`;
          markdown += `3. Copy the generated key\n`;
          markdown += `4. In Lamatic: Click Gemini node → Configure Credentials → Paste key\n`;
          markdown += `🔐 Keep your API key secure!\n`;
          markdown += `⏱️ Time: 2-3 minutes\n\n`;
        }
      });
    }
  }
  
  // Connection Review
  if (result.warningNodes > 0 || result.errorNodes > 0) {
    markdown += `### Step ${result.warningNodes > 0 ? '4' : '3'}: 🔍 Review Workflow Connections\n\n`;
    markdown += `**⚠️ Important:** Some workflow connections may be broken due to ${result.warningNodes > 0 ? `${result.warningNodes} nodes requiring setup` : ''}${result.warningNodes > 0 && result.errorNodes > 0 ? ' and ' : ''}${result.errorNodes > 0 ? `${result.errorNodes} conversion errors` : ''}.\n\n`;
    markdown += `1. Open your workflow in Lamatic Studio\n`;
    markdown += `2. Manually review all node connections and data flows\n`;
    markdown += `3. Verify that dependencies between nodes are properly linked\n`;
    markdown += `4. Check for any broken or missing connections\n`;
    markdown += `5. Fix any connection issues before proceeding\n\n`;
  }
  
  // Testing
  markdown += `### Step ${result.warningNodes > 0 || result.errorNodes > 0 ? '5' : '3'}: 🧪 Test Your Workflow\n`;
  markdown += `1. In Lamatic, click **"Test Run"** button\n`;
  markdown += `2. Provide sample input data for testing\n`;
  markdown += `3. Verify each node executes correctly\n`;
  markdown += `4. Check that output matches your expectations\n`;
  markdown += `5. Review execution logs for any issues\n\n`;
  
  // Deploy
  markdown += `### Step ${result.warningNodes > 0 || result.errorNodes > 0 ? '6' : '4'}: 🚀 Deploy & Go Live\n`;
  markdown += `1. Activate your workflow in Lamatic\n`;
  markdown += `2. Update webhook URLs in your external services (if applicable)\n`;
  markdown += `3. Monitor initial executions closely\n`;
  markdown += `4. Keep your original n8n workflow as backup\n\n`;
  
  markdown += `⏱️ **Total estimated time:** ${result.warningNodes > 0 || result.errorNodes > 0 ? '15-20' : result.warningNodes > 0 ? '10-15' : '5-8'} minutes\n\n`;
  markdown += `---\n\n`;
  
  // Credentials Required Section
  const credentialNodes = result.nodeResults?.filter((n: any) => 
    n.n8nNodeType?.includes('slack') || 
    n.n8nNodeType?.includes('gemini') ||
    n.n8nNodeType?.includes('google') ||
    n.message?.toLowerCase().includes('credential') ||
    n.message?.toLowerCase().includes('auth')
  );
  
  if (credentialNodes && credentialNodes.length > 0) {
    markdown += `## 🔐 Credentials Required\n\n`;
    markdown += `> ⚠️ **Important:** The following services need authentication setup in Lamatic. Your workflow won't run until these credentials are configured.\n\n`;
    
    credentialNodes.forEach((node: any, i: number) => {
      const isSlack = node.n8nNodeType?.includes('slack');
      const isGemini = node.n8nNodeType?.includes('gemini') || node.n8nNodeType?.includes('google');
      
      markdown += `### ${i + 1}. ${node.n8nNodeName}\n\n`;
      markdown += `**Service Type:** ${isSlack ? 'Slack messaging integration' : isGemini ? 'Google Gemini AI model' : 'External service integration'}\n\n`;
      
      if (isSlack) {
        markdown += `#### ⚠️ Action Required - Without this, Slack messages won't send\n\n`;
        markdown += `**Step-by-Step Setup:**\n\n`;
        markdown += `1. **Get Your Slack Token**\n`;
        markdown += `   - Visit [api.slack.com/apps](https://api.slack.com/apps)\n`;
        markdown += `   - Create or select your app → "OAuth & Permissions"\n`;
        markdown += `   - Copy **"Bot User OAuth Token"**\n\n`;
        markdown += `2. **Open Your Imported Workflow**\n`;
        markdown += `   - In Lamatic Studio, open the workflow you just imported\n`;
        markdown += `   - Find the **"${node.n8nNodeName}"** node\n\n`;
        markdown += `3. **Configure Credentials**\n`;
        markdown += `   - Click the node → Click **"Configure Credentials"**\n`;
        markdown += `   - Paste your Bot Token → Click **"Test Connection"** → Save\n\n`;
        markdown += `**Required Slack Permissions:**\n`;
        markdown += `- \`chat:write\`\n`;
        markdown += `- \`channels:read\`\n`;
        markdown += `- \`users:read\`\n\n`;
        markdown += `⏱️ **Time needed:** 3-5 minutes\n\n`;
      }
      
      if (isGemini) {
        markdown += `#### ⚠️ Action Required - AI features won't work without API key\n\n`;
        markdown += `**Step-by-Step Setup:**\n\n`;
        markdown += `1. **Get Your Gemini API Key**\n`;
        markdown += `   - Visit [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)\n`;
        markdown += `   - Click **"Create API Key"**\n`;
        markdown += `   - Select/create a Google Cloud project → Copy the key\n\n`;
        markdown += `2. **Open Your Imported Workflow**\n`;
        markdown += `   - In Lamatic Studio, open the workflow you just imported\n`;
        markdown += `   - Find the **"${node.n8nNodeName}"** node\n\n`;
        markdown += `3. **Add API Key to Lamatic**\n`;
        markdown += `   - Click the node → Click **"Configure Credentials"**\n`;
        markdown += `   - Paste your API Key → Click **"Test API Key"** → Save\n\n`;
        markdown += `> 🔐 **Security Warning:** Never share your API key publicly or commit it to version control. Treat it like a password.\n\n`;
        markdown += `⏱️ **Time needed:** 2-3 minutes\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  }
  
  // Node Conversion Details - Table Format for Notion
  markdown += `## 📋 Node Conversion Details\n\n`;
  markdown += `All your n8n workflow nodes and their conversion status. This table shows what was converted and what needs attention.\n\n`;
  
  // Create table header
  markdown += `| Status | Node Name | n8n Type | → | Lamatic Type | Notes |\n`;
  markdown += `|--------|-----------|----------|---|--------------|-------|\n`;
  
  // Add table rows
  result.nodeResults?.forEach((node: any) => {
    const statusEmoji = node.status === 'success' ? '✅ Converted' : node.status === 'warning' ? '⚠️ Needs Setup' : '❌ Error';
    const nodeName = node.n8nNodeName || 'Unnamed';
    const n8nType = node.n8nNodeType || 'Unknown';
    const lamaticType = node.lamaticNodeType || 'Unknown';
    
    // Escape pipe characters and newlines in content to prevent breaking table
    const escapedNodeName = (nodeName || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
    const escapedN8nType = (n8nType || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
    const escapedLamaticType = (lamaticType || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
    const notes = node.message ? (node.message || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() : '—';
    
    markdown += `| ${statusEmoji} | ${escapedNodeName} | \`${escapedN8nType}\` | → | \`${escapedLamaticType}\` | ${notes} |\n`;
  });
  
  markdown += `\n`;
  
  // Add legend for non-tech users
  markdown += `### Status Legend\n\n`;
  markdown += `- **✅ Converted:** Node is ready to use\n`;
  markdown += `- **⚠️ Needs Setup:** Requires configuration (like adding API keys)\n`;
  markdown += `- **❌ Error:** Needs manual review\n\n`;
  
  markdown += `---\n\n`;
  
  // Tips
  markdown += `## 💡 Tips for Success\n\n`;
  markdown += `- Test each node individually before running the full workflow\n`;
  markdown += `- Set up all required credentials before testing\n`;
  markdown += `- Keep your original n8n workflow as backup\n`;
  markdown += `- Monitor logs during initial executions\n\n`;
  
  // Support & Help Section
  markdown += `## 📞 Need Help?\n\n`;
  markdown += `If you encounter any issues during migration or need assistance building your workflow:\n\n`;
  markdown += `- 📚 **[Lamatic Documentation](https://lamatic.ai/docs)** - Comprehensive guides and API reference\n`;
  markdown += `- 💬 **[Join Slack Community](https://lamatic.ai/docs/slack)** - Get help from the community and Lamatic team\n`;
  markdown += `- 🆘 **[Contact Support](https://lamatic.ai/support)** - Direct support for migration issues\n\n`;
  
  markdown += `---\n\n`;
  markdown += `*Report generated by n8n to Lamatic Migration Tool*\n`;
  
  return markdown;
};

const generatePDF = async (result: any, originalFileName?: string, reportElement?: HTMLElement | null) => {
  try {
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 25;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = margin;

    const timestamp = new Date().toLocaleString();
    const successRate = result.totalNodes > 0 ? Math.round((result.convertedNodes / result.totalNodes) * 100) : 0;

    // Color palette - minimal, professional
    const colors = {
      text: [30, 30, 30],        // Near black for text
      textLight: [115, 115, 115], // Gray for secondary text
      accent: [220, 38, 38],      // Red accent (minimal use)
      border: [230, 230, 230],    // Light gray borders
      success: [22, 163, 74]      // Green for success only
    };

    // Helper: Add new page if needed
    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Helper: Draw subtle line
    const drawLine = () => {
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    };

    // ==========================================
    // HEADER - Clean & Simple
    // ==========================================
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('n8n to Lamatic Migration Report', margin, yPos);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text(`Generated on ${timestamp}`, margin, yPos);
    yPos += 10;

    drawLine();

    // ==========================================
    // MIGRATION SUMMARY - Enhanced with all details
    // ==========================================
    checkPageBreak(25);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Migration Summary', margin, yPos);
    yPos += 7;

    // Summary grid - 2 columns
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    
    // Row 1: Workflow Name & Processing Time
    pdf.text('Workflow Name:', margin, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(result.lamaticWorkflow?.name || 'Unnamed Workflow', margin + 35, yPos);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Processing Time:', margin + 100, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.round((result.processingTime || 0) / 1000)} seconds`, margin + 135, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 6;

    // Row 2: Completed Date & Success Rate
    pdf.text('Completed:', margin, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(new Date().toLocaleString(), margin + 35, yPos);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Success Rate:', margin + 100, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    pdf.text(`${successRate}%`, margin + 135, yPos);
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.setFont('helvetica', 'normal');
    yPos += 8;

    // What this means section
    pdf.setFontSize(8);
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text(`All ${result.totalNodes} automation nodes from your n8n workflow have been converted to Lamatic format.`, margin, yPos);
    yPos += 4;
    pdf.text('Your workflow logic, connections, and automation flows are ready to use in Lamatic.', margin, yPos);
    yPos += 10;

    drawLine();

    // ==========================================
    // MIGRATION STATISTICS - 4-column grid
    // ==========================================
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Migration Statistics', margin, yPos);
    yPos += 8;

    // Statistics grid
    const stats = [
      { label: 'Total Nodes', value: result.totalNodes, color: colors.text },
      { label: 'Converted', value: result.convertedNodes, color: colors.success },
      { label: 'Need Setup', value: result.warningNodes || 0, color: colors.text },
      { label: 'Errors', value: result.errorNodes || 0, color: colors.text }
    ];

    const statWidth = contentWidth / 4;
    stats.forEach((stat, i) => {
      const xPos = margin + (i * statWidth);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
      pdf.text(String(stat.value), xPos, yPos);
      yPos += 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.text(stat.label, xPos, yPos);
      yPos -= 5;
    });
    yPos += 10;

    drawLine();

    // ==========================================
    // CREDENTIALS REQUIRED - Clean list
    // ==========================================
    const credentialNodes = result.nodeResults?.filter((n: any) => 
      n.n8nNodeType?.includes('slack') || 
      n.n8nNodeType?.includes('gemini') ||
      n.n8nNodeType?.includes('google') ||
      n.message?.toLowerCase().includes('credential') ||
      n.message?.toLowerCase().includes('auth')
    );

    if (credentialNodes && credentialNodes.length > 0) {
      checkPageBreak(20);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.text('Authentication Required', margin, yPos);
      yPos += 7;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.text('The following services need credentials configured in Lamatic:', margin, yPos);
      yPos += 8;

      credentialNodes.forEach((node: any, index: number) => {
        checkPageBreak(35);
        const isSlack = node.n8nNodeType?.includes('slack');
        const isGemini = node.n8nNodeType?.includes('gemini') || node.n8nNodeType?.includes('google');
        
        // Node name with icon
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        pdf.text(`${index + 1}. ${node.n8nNodeName}`, margin + 3, yPos);
        yPos += 5;
        
        // Service type
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        
        if (isSlack) {
          pdf.text('Service: Slack messaging integration', margin + 6, yPos);
          yPos += 6;
          
          // Warning box
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(234, 179, 8); // yellow
          pdf.text('⚠️ Action Required - Without this, Slack messages won\'t send', margin + 6, yPos);
          yPos += 5;
          
          // Step-by-step setup
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('Step-by-Step Setup:', margin + 6, yPos);
          yPos += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text('1. Get Your Slack Token', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('Visit api.slack.com/apps → Create or select your app → "OAuth & Permissions"', margin + 12, yPos);
          yPos += 3.5;
          pdf.text('Copy "Bot User OAuth Token"', margin + 12, yPos);
          yPos += 5;
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('2. Open Your Imported Workflow', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text(`In Lamatic Studio, open the workflow → Find the "${node.n8nNodeName}" node`, margin + 12, yPos);
          yPos += 5;
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('3. Configure Credentials', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('Click the node → "Configure Credentials" → Paste Bot Token → "Test Connection" → Save', margin + 12, yPos);
          yPos += 5;
          
          // Required permissions
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('Required Slack Permissions:', margin + 10, yPos);
          yPos += 4;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('chat:write, channels:read, users:read', margin + 12, yPos);
          yPos += 4;
          pdf.text('Time needed: 3-5 minutes', margin + 12, yPos);
          
        } else if (isGemini) {
          pdf.text('Service: Google Gemini AI model', margin + 6, yPos);
          yPos += 6;
          
          // Warning box
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(234, 179, 8); // yellow
          pdf.text('⚠️ Action Required - AI features won\'t work without API key', margin + 6, yPos);
          yPos += 5;
          
          // Step-by-step setup
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('Step-by-Step Setup:', margin + 6, yPos);
          yPos += 5;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text('1. Get Your Gemini API Key', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('Visit makersuite.google.com/app/apikey → Click "Create API Key"', margin + 12, yPos);
          yPos += 3.5;
          pdf.text('Select/create a Google Cloud project → Copy the key', margin + 12, yPos);
          yPos += 5;
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('2. Open Your Imported Workflow', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text(`In Lamatic Studio, open the workflow → Find the "${node.n8nNodeName}" node`, margin + 12, yPos);
          yPos += 5;
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.text('3. Add API Key to Lamatic', margin + 10, yPos);
          yPos += 4;
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('Click the node → "Configure Credentials" → Paste API Key → "Test API Key" → Save', margin + 12, yPos);
          yPos += 5;
          
          // Security warning
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(239, 68, 68); // red
          pdf.text('🔐 Security Warning:', margin + 10, yPos);
          yPos += 4;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          pdf.text('Never share your API key publicly or commit it to version control.', margin + 12, yPos);
          yPos += 3.5;
          pdf.text('Time needed: 2-3 minutes', margin + 12, yPos);
        } else {
          pdf.text('Service: External Integration', margin + 6, yPos);
          yPos += 4;
          pdf.text('Configure authentication in Lamatic platform', margin + 6, yPos);
        }
        
        yPos += 8;
      });
      
      yPos += 4;
      drawLine();
    }

    // ==========================================
    // NODE CONVERSION DETAILS - Enhanced with status
    // ==========================================
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Node Conversion Details', margin, yPos);
    yPos += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text('All nodes have been successfully mapped to Lamatic equivalents:', margin, yPos);
    yPos += 8;

    result.nodeResults?.forEach((node: any, i: number) => {
      checkPageBreak(12);
      
      // Status indicator
      const statusSymbol = node.status === 'success' ? '✓' : node.status === 'warning' ? '!' : '✗';
      const statusColor = node.status === 'success' 
        ? colors.success 
        : node.status === 'warning' 
        ? [234, 179, 8] // yellow
        : [239, 68, 68]; // red
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(statusSymbol, margin + 3, yPos);
      
      // Node name
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.text(node.n8nNodeName, margin + 10, yPos);
      
      // Status badge
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(`[${node.status}]`, margin + 10, yPos + 3.5);
      
      // Node type conversion
      yPos += 5;
      pdf.setFontSize(8);
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.text(`${node.n8nNodeType} → ${node.lamaticNodeType}`, margin + 10, yPos);
      
      // Message if present
      if (node.message) {
        yPos += 4;
        pdf.setFontSize(7);
        pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        const messageLines = pdf.splitTextToSize(node.message, contentWidth - 15);
        pdf.text(messageLines, margin + 10, yPos);
        yPos += (messageLines.length * 3);
      }
      
      yPos += 5;
    });
    
    yPos += 4;
    drawLine();

    // ==========================================
    // WHAT'S NEXT - SAME AS MODAL
    // ==========================================
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('What\'s Next?', margin, yPos);
    yPos += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Follow these steps to complete your workflow migration:', margin, yPos);
    yPos += 8;

    // Step 1
    pdf.setFont('helvetica', 'bold');
    pdf.text('Step 1: Open Lamatic Studio', margin, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Navigate to studio.lamatic.ai in your browser', margin, yPos);
    yPos += 8;

    // Step 2 - Simplified
    pdf.setFont('helvetica', 'bold');
    pdf.text('Step 2: Import Your Workflow', margin, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Copy-Paste Method (Easiest):', margin, yPos);
    yPos += 4;
    pdf.text('1. Open your downloaded file in any text editor', margin, yPos);
    yPos += 4;
    pdf.text('2. Select all content (Ctrl+A or Cmd+A) and copy', margin, yPos);
    yPos += 4;
    pdf.text('3. In Lamatic Studio, open a flow or create a new one, then click the "Config" toggle (top-right)', margin, yPos);
    yPos += 4;
    pdf.text('4. Paste the JSON content into the editor', margin, yPos);
    yPos += 4;
    pdf.text('5. Put in your API keys and credentials', margin, yPos);
    yPos += 4;
    pdf.text('6. Done! Your workflow is now imported', margin, yPos);
    yPos += 10;

    // Complete Setup Guide Section
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Complete Setup Guide', margin, yPos);
    yPos += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('For detailed setup instructions including testing and deployment, see below.', margin, yPos);
    yPos += 8;

    // Step 3 - Credentials (if needed)
    if (result.warningNodes > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Step 3: MUST FIX - Configure Credentials', margin, yPos);
      yPos += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Your workflow requires authentication setup. It won\'t run until these are configured.', margin, yPos);
      yPos += 6;
      
      const credentialNodes = result.nodeResults?.filter((n: any) => 
        n.n8nNodeType?.includes('slack') || 
        n.n8nNodeType?.includes('gemini') ||
        n.message?.toLowerCase().includes('credential')
      );
      
      if (credentialNodes && credentialNodes.length > 0) {
        credentialNodes.forEach((node: any) => {
          const isSlack = node.n8nNodeType?.includes('slack');
          const isGemini = node.n8nNodeType?.includes('gemini');
          
          if (isSlack) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Slack Setup:', margin, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.text('1. Visit api.slack.com/apps', margin, yPos);
            yPos += 4;
            pdf.text('2. Create app → OAuth & Permissions', margin, yPos);
            yPos += 4;
            pdf.text('3. Copy "Bot User OAuth Token"', margin, yPos);
            yPos += 4;
            pdf.text('4. In Lamatic: Click Slack node → Configure Credentials', margin, yPos);
            yPos += 4;
            pdf.text('5. Required permissions: chat:write, channels:read', margin, yPos);
            yPos += 4;
            pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
            pdf.text('Estimated time: 3-5 minutes', margin, yPos);
            pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            yPos += 8;
          }
          
          if (isGemini) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Google Gemini Setup:', margin, yPos);
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.text('1. Visit makersuite.google.com/app/apikey', margin, yPos);
            yPos += 4;
            pdf.text('2. Click "Create API Key"', margin, yPos);
            yPos += 4;
            pdf.text('3. Copy the generated key', margin, yPos);
            yPos += 4;
            pdf.text('4. In Lamatic: Click Gemini node → Configure Credentials', margin, yPos);
            yPos += 4;
            pdf.text('5. Keep your API key secure!', margin, yPos);
            yPos += 4;
            pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
            pdf.text('Estimated time: 2-3 minutes', margin, yPos);
            pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            yPos += 8;
          }
        });
      }
    }

    // Step 4 - Testing
    const stepNumber = result.warningNodes > 0 ? '4' : '3';
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Step ${stepNumber}: Test Your Workflow`, margin, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('1. In Lamatic, click "Test Run" button', margin, yPos);
    yPos += 4;
    pdf.text('2. Provide sample input data for testing', margin, yPos);
    yPos += 4;
    pdf.text('3. Verify each node executes correctly', margin, yPos);
    yPos += 4;
    pdf.text('4. Check that output matches your expectations', margin, yPos);
    yPos += 4;
    pdf.text('5. Review execution logs for any issues', margin, yPos);
    yPos += 8;

    // Step 5 - Deploy
    const deployStepNumber = result.warningNodes > 0 ? '5' : '4';
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Step ${deployStepNumber}: Deploy & Go Live`, margin, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('1. Activate your workflow in Lamatic', margin, yPos);
    yPos += 4;
    pdf.text('2. Update webhook URLs in your external services (if applicable)', margin, yPos);
    yPos += 4;
    pdf.text('3. Monitor initial executions closely', margin, yPos);
    yPos += 4;
    pdf.text('4. Keep your original n8n workflow as backup', margin, yPos);
    yPos += 8;

    // Processing Time Info
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text(`Estimated setup time: ${result.warningNodes > 0 ? '10-15 minutes' : '5-8 minutes'} (including credential configuration)`, margin, yPos);
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    yPos += 8;

    // ==========================================
    // FOOTER - Minimal
    // ==========================================
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Bottom border line
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Page number and info
      pdf.setFontSize(8);
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
      pdf.text('lamatic.ai', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Download - use original filename if available
    const reportBaseName = originalFileName || result.lamaticWorkflow?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'workflow';
    const filename = `${reportBaseName}_migration-report.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

// Fallback - old browser print method (not used anymore)
const generatePDFLegacy = async (result: any) => {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) return;

  const timestamp = new Date().toLocaleString();
  const successRate = Math.round((result.convertedNodes / result.totalNodes) * 100);
  
  reportWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Migration Report - ${result.lamaticWorkflow?.name || 'Workflow'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', -apple-system, system-ui, sans-serif; 
          padding: 40px; 
          color: #1e1e1e;
          line-height: 1.6;
        }
        .header { 
          border-bottom: 3px solid #f33736; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .header h1 { 
          font-size: 32px; 
          font-weight: 600; 
          margin-bottom: 8px;
          color: #1e1e1e;
        }
        .header p { 
          color: #666; 
          font-size: 14px; 
        }
        .summary { 
          background: #f9f9f9; 
          padding: 24px; 
          border-radius: 12px; 
          margin-bottom: 30px; 
        }
        .summary h2 { 
          font-size: 20px; 
          margin-bottom: 16px; 
          color: #1e1e1e;
        }
        .stats { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 16px; 
          margin-bottom: 20px; 
        }
        .stat { 
          background: white; 
          padding: 16px; 
          border-radius: 8px; 
          border: 2px solid #e5e5e5; 
        }
        .stat-label { 
          font-size: 12px; 
          color: #666; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          margin-bottom: 4px;
        }
        .stat-value { 
          font-size: 28px; 
          font-weight: 700; 
        }
        .stat-total { color: #3b82f6; }
        .stat-success { color: #22c55e; }
        .stat-warning { color: #eab308; }
        .stat-error { color: #ef4444; }
        .info-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 12px; 
          margin-top: 16px; 
        }
        .info-item { 
          background: white; 
          padding: 12px; 
          border-radius: 6px; 
          border: 1px solid #e5e5e5; 
        }
        .info-label { 
          font-size: 11px; 
          color: #888; 
          text-transform: uppercase; 
          margin-bottom: 4px; 
        }
        .info-value { 
          font-size: 14px; 
          font-weight: 600; 
          color: #1e1e1e; 
        }
        .nodes-section { 
          margin-top: 30px; 
        }
        .nodes-section h2 { 
          font-size: 20px; 
          margin-bottom: 16px; 
          color: #1e1e1e;
        }
        .node-item { 
          background: white; 
          padding: 14px 16px; 
          border: 1px solid #e5e5e5; 
          border-radius: 8px; 
          margin-bottom: 8px; 
          display: flex; 
          align-items: center; 
          gap: 12px;
        }
        .node-status { 
          width: 24px; 
          height: 24px; 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: bold; 
          font-size: 14px; 
          flex-shrink: 0;
        }
        .status-success { background: #dcfce7; color: #16a34a; }
        .status-warning { background: #fef3c7; color: #ca8a04; }
        .status-error { background: #fee2e2; color: #dc2626; }
        .node-content { flex: 1; }
        .node-name { 
          font-weight: 600; 
          font-size: 14px; 
          margin-bottom: 2px; 
          color: #1e1e1e;
        }
        .node-type { 
          font-size: 12px; 
          color: #666; 
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e5e5; 
          text-align: center; 
          color: #888; 
          font-size: 12px; 
        }
        .success-badge {
          background: #22c55e;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          display: inline-block;
          margin-top: 8px;
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Migration Report</h1>
        <p>Workflow: ${result.lamaticWorkflow?.name || 'N/A'}</p>
        <p>Generated: ${timestamp}</p>
        <div class="success-badge">✓ ${successRate}% Success Rate</div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Total Nodes</div>
            <div class="stat-value stat-total">${result.totalNodes}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Converted</div>
            <div class="stat-value stat-success">${result.convertedNodes}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Warnings</div>
            <div class="stat-value stat-warning">${result.warningNodes || 0}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Errors</div>
            <div class="stat-value stat-error">${result.errorNodes || 0}</div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Processing Time</div>
            <div class="info-value">${Math.round((result.processingTime || 0) / 1000)} seconds</div>
          </div>
          <div class="info-item">
            <div class="info-label">Success Rate</div>
            <div class="info-value">${successRate}%</div>
          </div>
        </div>
      </div>

      <div class="nodes-section">
        <h2>Converted Nodes (${result.nodeResults?.length || 0})</h2>
        ${result.nodeResults?.map((node: any) => `
          <div class="node-item">
            <div class="node-status status-${node.status}">
              ${node.status === 'success' ? '✓' : node.status === 'warning' ? '!' : '✗'}
            </div>
            <div class="node-content">
              <div class="node-name">${node.n8nNodeName}</div>
              <div class="node-type">Converted to ${node.lamaticNodeType}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="footer">
        <p>Generated by n8n to Lamatic Migration Tool</p>
        <p>https://lamatic.ai</p>
      </div>
    </body>
    </html>
  `);
  
  reportWindow.document.close();
  
  // Wait for content to load, then trigger print
  setTimeout(() => {
    reportWindow.print();
  }, 500);
};

export default function MigrationTool() {
  const [view, setView] = useState<'choose' | 'upload' | 'processing' | 'success'>('choose');
  const [result, setResult] = useState<any>(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [processingStage, setProcessingStage] = useState<'parsing' | 'mapping' | 'building' | 'generating' | 'finalizing'>('parsing');
  const [cardsVisible, setCardsVisible] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [pastedJson, setPastedJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Alex Smith",
      role: "CTO, TechFlow",
      initials: "AS",
      text: "Migrated 50+ n8n workflows to Lamatic in minutes. The intelligent node mapping saved us weeks of manual migration work.",
    },
    {
      id: 2,
      name: "Maria Johnson",
      role: "Lead Engineer, AutoCorp",
      initials: "MJ",
      text: "The n8n to Lamatic dependency resolution is incredible. All our complex automation workflows maintained perfect connections.",
    },
    {
      id: 3,
      name: "David Rodriguez",
      role: "DevOps Lead, CloudScale",
      initials: "DR",
      text: "Production-ready Lamatic workflows from day one. The migration report helped us identify exactly what needed attention.",
    },
  ];

  // Trigger card appearance animation
  useEffect(() => {
    if (view === 'choose') {
      setTimeout(() => setCardsVisible(true), 100);
    } else {
      setCardsVisible(false);
    }
  }, [view]);



  const handleConvert = async () => {
    if (!pastedJson.trim()) return;

    // Validate JSON format
    try {
      JSON.parse(pastedJson);
    } catch (error) {
      alert('Invalid JSON format. Please check your JSON and try again.');
      return;
    }

    setView('processing');
    setProgress(0);
    
    // Use original filename if available, otherwise default
    if (!originalFileName) {
      setOriginalFileName('workflow');
    }

    try {
      setProcessingMsg('Parsing n8n workflow...');
      setProgress(25);
      await new Promise(r => setTimeout(r, 400));

      setProcessingMsg('Mapping nodes to Lamatic...');
      setProgress(50);
      await new Promise(r => setTimeout(r, 400));

      setProcessingMsg('Building connections...');
      setProgress(75);
      await new Promise(r => setTimeout(r, 400));

      setProcessingMsg('Finalizing migration...');
      setProgress(90);

      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jsonText: pastedJson }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || 'Migration failed');
      }

      const data = await res.json();
      
      // Debug: Log the result
      console.log('Migration result:', {
        success: data.success,
        totalNodes: data.totalNodes,
        convertedNodes: data.convertedNodes,
        errors: data.errors,
        warnings: data.warnings
      });
      setProgress(100);
      
      await new Promise(r => setTimeout(r, 300));
      setResult(data);
      setView('success');
      setPastedJson(''); // Clear pasted JSON after successful migration
    } catch (error) {
      console.error('Migration failed:', error);
      setView('upload');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      // Read file content and populate textarea
      const text = await file.text();
      setPastedJson(text);
      // Store original filename for download naming
      const baseName = file.name.replace(/\.json$/i, '');
      setOriginalFileName(baseName);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      // Read file content and populate textarea
      const text = await file.text();
      setPastedJson(text);
      // Store original filename for download naming
      const baseName = file.name.replace(/\.json$/i, '');
      setOriginalFileName(baseName);
    }
  };

  const downloadFile = () => {
    if (!result?.lamaticWorkflow) return;
    const blob = new Blob([JSON.stringify(result.lamaticWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use original filename with _lamatic suffix, or fallback to workflow name
    const downloadName = originalFileName 
      ? `${originalFileName}_lamatic.json`
      : `${result.lamaticWorkflow.name.replace(/\s+/g, '_')}_lamatic.json`;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
    
    // FIX: Don't auto-reset - let user stay on success page
    // User might want to download report, copy markdown, etc.
    // They can click "Migrate Another" when ready
  };

  const reset = () => {
    setView('choose');
    setResult(null);
    setProgress(0);
    setOriginalFileName('');
    setPastedJson('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" className="text-primary" opacity="0.12" />
                <path d="M12 8L16 12L12 16L8 12L12 8Z" fill="currentColor" className="text-primary" />
              </svg>
              <div className="flex items-center gap-2.5">
                <span className="font-medium text-base">n8n</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground arrow-animate" />
                <span className="font-medium text-base gradient-text">Lamatic</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6">
              <a
                href="https://lamatic.ai/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Docs
              </a>
              <a
                href="https://github.com/Lamatic/AgentKit"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 lg:px-8 py-4 md:py-6 w-full">
        
        {/* Success State - Compact Migration Summary */}
        {view === 'success' && result && (
          <div className="animate-slide-up space-y-6">
            {/* Success Header with animated checkmark */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center mx-auto mb-4 animate-success-pop">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="rgb(34, 197, 94)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-check"
                  />
                </svg>
              </div>
              
              <h1 className="mb-3 !text-4xl">n8n to Lamatic Migration Complete!</h1>
              <p className="description max-w-2xl mx-auto !text-base">
                Your workflow automation has been successfully converted from n8n to Lamatic with preserved connections and dependencies
              </p>
            </div>

            {/* Migration Stats - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card p-5 rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all" style={{ animationDelay: '0.1s' }}>
                <div className="text-3xl font-semibold mb-1.5">{result.totalNodes}</div>
                <div className="label text-muted-foreground">Total Workflow Nodes</div>
              </div>
              <div className="stat-card p-5 rounded-xl border-2 border-green-500/30 bg-green-500/10 backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
                <div className="text-3xl font-semibold text-green-600 dark:text-green-400 mb-1.5">{result.convertedNodes}</div>
                <div className="label text-muted-foreground">Successfully Migrated</div>
              </div>
              {result.warningNodes > 0 && (
                <div className="stat-card p-5 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm" style={{ animationDelay: '0.3s' }}>
                  <div className="text-3xl font-semibold text-yellow-600 dark:text-yellow-400 mb-1.5">{result.warningNodes}</div>
                  <div className="label text-muted-foreground">Needs Attention</div>
                </div>
              )}
              <div className="stat-card p-5 rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all" style={{ animationDelay: '0.4s' }}>
                <div className="text-3xl font-semibold mb-1.5">
                  {result.totalNodes > 0 ? Math.round((result.convertedNodes / result.totalNodes) * 100) : 0}%
                </div>
                <div className="label text-muted-foreground">Migration Success</div>
              </div>
            </div>

            {/* Conversion Summary - Before Buttons for SEO */}
            <div className="space-y-3 pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Workflow Migration Summary</h2>
              <p className="text-sm text-muted-foreground">
                {result.totalNodes} automation nodes from your n8n workflow have been processed for Lamatic platform compatibility
              </p>
              
              {/* Summary Cards - SEO Optimized */}
              <div className="grid gap-3 mt-4">
                {/* Success Summary */}
                {result.nodeResults?.filter((n: any) => n.status === 'success').length > 0 && (
                  <div className="p-4 border-2 border-green-500/30 bg-green-500/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {result.nodeResults.filter((n: any) => n.status === 'success').length} workflow nodes successfully migrated to Lamatic
                        </div>
                        <div className="text-xs text-muted-foreground">
                          All automation logic and connections preserved
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning Summary */}
                {result.warningNodes > 0 && (
                  <div className="p-4 border-2 border-yellow-500/30 bg-yellow-500/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">
                          {result.warningNodes} nodes require manual configuration
                        </div>
                        <div className="text-xs text-muted-foreground">
                          API credentials or integration settings need to be reconfigured in Lamatic
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

             {/* Action Buttons - FOCUSED DESIGN */}
             <div className="space-y-4 pb-6 border-b border-border">
               {/* TWO MAIN ACTIONS - CLEAR HIERARCHY */}
               <div className="flex gap-4">
                 {/* PRIMARY: Download Workflow - Modern Design */}
                 <button
                   onClick={downloadFile}
                   className="
                     group relative overflow-hidden flex-1
                     h-14 px-8 rounded-xl
                     bg-gradient-to-r from-red-700 via-red-600 to-red-700
                     text-white font-bold text-base
                     shadow-lg shadow-red-500/25
                     hover:shadow-2xl hover:shadow-red-500/40
                     hover:scale-[1.02]
                     active:scale-[0.98]
                     transition-all duration-300
                     border-2 border-red-600/30
                   "
                 >
                   <span className="relative z-10 flex items-center justify-center gap-3">
                     <Download className="w-5 h-5 group-hover:animate-download-bounce" />
                     Download Lamatic Workflow
                   </span>
                   {/* Modern shine sweep */}
                   <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                   {/* Subtle pulse effect */}
                   <div className="absolute inset-0 rounded-xl bg-red-500/20 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300" />
                 </button>

                 {/* SECONDARY: View Report */}
                 <button
                   onClick={() => setShowReport(true)}
                   className="
                     flex-1
                     h-14 px-8 rounded-xl
                     bg-card
                     border-2 border-primary/30
                     text-foreground font-semibold text-base
                     hover:bg-primary/5
                     hover:border-primary/60
                     hover:-translate-y-0.5
                     transition-all duration-200
                     shadow-md hover:shadow-lg
                     inline-flex items-center justify-center gap-3
                   "
                 >
                   <FileText className="w-5 h-5 text-primary" />
                   View Full Report
                 </button>
               </div>

               {/* TERTIARY: Migrate Another */}
               <div className="text-center">
                 <button
                   onClick={reset}
                   className="
                     px-6 py-2 rounded-lg
                     text-muted-foreground font-medium text-sm
                     hover:text-foreground
                     hover:bg-muted
                     transition-all duration-200
                     inline-flex items-center gap-2
                   "
                 >
                   <RefreshCw className="w-4 h-4" />
                   Migrate Another Workflow
                 </button>
               </div>
             </div>

            {/* Minimalistic Step-by-Step Instructions */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold mb-1">Next Steps</h2>
                <p className="text-sm text-muted-foreground">Follow these instructions to import your workflow into Lamatic</p>
              </div>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-medium text-sm">1.</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-1.5">Go to Lamatic Studio</h3>
                    <a 
                      href="https://studio.lamatic.ai" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      studio.lamatic.ai
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground font-medium text-sm">2.</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-3">Import your workflow</h3>
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>Open the downloaded JSON file in any text editor</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>Select all content (<code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Ctrl+A</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Cmd+A</code>) and copy it</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>In Lamatic Studio, open an existing <strong className="text-foreground">flow</strong> or create a new one</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>Click the <strong className="text-foreground">"Config"</strong> toggle button in the top-right corner</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>Paste the JSON content into the editor</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-muted-foreground mt-0.5">→</span>
                        <span>Add your API keys and credentials where needed</span>
                      </li>
                      <li className="flex items-start gap-2.5 pt-1">
                        <span className="text-muted-foreground mt-0.5">✓</span>
                        <span className="text-foreground">Your workflow is now imported and ready to use</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing State - FIX #7: Detailed Stage Display */}
        {view === 'processing' && (
          <div className="text-center py-16 animate-slide-up">
            <div className="w-14 h-14 rounded-full border-[3px] border-primary/20 border-t-primary mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-semibold mb-3">{processingMsg}</h2>
            
            {/* Stage indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className={`w-2 h-2 rounded-full transition-all ${progress >= 25 ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`w-2 h-2 rounded-full transition-all ${progress >= 50 ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`w-2 h-2 rounded-full transition-all ${progress >= 75 ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`w-2 h-2 rounded-full transition-all ${progress >= 90 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
            
            <div className="max-w-md mx-auto mb-4">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
            </div>
            <div className="text-base font-medium text-muted-foreground">{Math.round(progress)}%</div>
          </div>
        )}

        {/* Upload State */}
        {view === 'upload' && (
          <div className="animate-slide-up">
            <button
              onClick={() => setView('choose')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors font-medium"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </button>

            <div className="mb-8">
              <h1 className="mb-3">Upload Workflow</h1>
              <p className="description max-w-2xl">
                Upload your n8n workflow JSON file or paste JSON content for instant conversion to Lamatic automation platform format
              </p>
            </div>

            {/* Unified Upload/Paste Interface */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                className={`
                  relative border-2 border-dashed rounded-2xl p-6 transition-all
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-foreground">
                        Paste JSON or drop file here
                      </label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Browse files
                      </button>
                    </div>
                    <textarea
                      value={pastedJson}
                      onChange={(e) => setPastedJson(e.target.value)}
                      placeholder={dragActive 
                        ? 'Drop your JSON file here...' 
                        : 'Paste your n8n workflow JSON here, or drag and drop a .json file...'}
                      className="w-full h-80 p-4 rounded-xl border-2 border-border bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:border-primary transition-colors"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {pastedJson.trim() 
                          ? `${(pastedJson.length / 1024).toFixed(1)} KB` 
                          : 'Supports both file upload and direct paste'
                        }
                      </p>
                      <div className="inline-flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <span>JSON format</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>Max 10MB</span>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <button
                onClick={handleConvert}
                disabled={!pastedJson.trim()}
                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-base transition-all
                  ${pastedJson.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                Convert Workflow
              </button>
            </div>
          </div>
        )}

        {/* Choose State */}
        {view === 'choose' && (
          <div className="animate-slide-up">
            {/* Hero - Balanced */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/30 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="label text-xs">Migration Tool</span>
              </div>

              <h1 className="mb-3 !leading-tight !text-3xl md:!text-4xl">
                Convert n8n to Lamatic
              </h1>

              <p className="description mx-auto max-w-2xl text-sm mb-8">
                Migrate n8n workflows to Lamatic automation platform. Convert n8n JSON workflows with intelligent node mapping, dependency resolution, and automated migration tools.
              </p>
            </div>

            {/* Primary Action - Natural Hierarchy */}
            <div className="max-w-xl mx-auto mb-10">
              <button
                onClick={() => setView('upload')}
                className={`
                  w-full migration-card-primary group text-left p-6 rounded-xl relative
                  ${cardsVisible ? 'card-appear' : 'opacity-0'}
                `}
                style={{ animationDelay: '0.1s' }}
              >
                {/* Subtle gradient background */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent opacity-60" />
                
                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon - Balanced Size */}
                  <div className="icon-container shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/15 to-primary/8 flex items-center justify-center border border-primary/25 group-hover:border-primary/40 transition-all">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold mb-1.5 text-foreground">Upload Workflow</h3>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed mb-3">
                      Upload n8n workflow JSON files for instant conversion to Lamatic format with automated node mapping
                    </p>
                    
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <span>Get started</span>
                      <ArrowRight className="w-4 h-4 arrow-slide" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Supporting Content - Balanced Layout */}
            <div className="max-w-5xl mx-auto">
              {/* Features - Integrated */}
              <div className="grid md:grid-cols-3 gap-5 mb-10">
                <div className="feature-card text-center p-5">
                  <div className="icon-container w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Workflow className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">Smart Mapping</h3>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Intelligent node conversion and optimization
                  </p>
                </div>

                <div className="feature-card text-center p-5">
                  <div className="icon-container w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">Instant Processing</h3>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Fast workflow conversion with real-time progress
                  </p>
                </div>

                <div className="feature-card text-center p-5">
                  <div className="icon-container w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5">Production Ready</h3>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    Download production-ready Lamatic workflows
                  </p>
                </div>
              </div>

              {/* Testimonials - Natural Flow */}
              <div className="pt-8 border-t border-border">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/30 mb-3">
                    <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                    <span className="label text-xs">Trusted by Teams</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold mb-2">
                    Loved by Developers Worldwide
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-2xl mx-auto mb-6">
                    Read testimonials from teams who migrated n8n workflows to Lamatic automation platform
                  </p>
                </div>

                {/* Testimonials Grid - Balanced */}
                <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={testimonial.id}
                      className="testimonial-card group relative bg-card border border-border rounded-lg p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-sm"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Quote Icon - Subtle */}
                      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                        <Quote className="w-5 h-5 text-foreground" />
                      </div>

                      {/* Testimonial Text */}
                      <p className="text-xs text-foreground/80 mb-4 leading-relaxed relative z-10 pr-6">
                        &ldquo;{testimonial.text}&rdquo;
                      </p>

                      {/* Author Info */}
                      <div className="flex items-center gap-2.5 pt-4 border-t border-border">
                        <div className="testimonial-avatar w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-medium text-xs text-foreground/70 transition-all duration-300 group-hover:border-primary/30">
                          {testimonial.initials}
                        </div>
                        <div>
                          <div className="font-medium text-xs text-foreground">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground leading-tight">
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Migration Report Modal */}
        {showReport && result && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-slide-up" 
            onClick={() => setShowReport(false)}
          >
            <div 
              className="bg-background border-2 border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Complete Migration Report</h2>
                    <p className="text-sm text-muted-foreground">Full analysis of n8n to Lamatic workflow conversion</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReport(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto modal-scroll px-6 py-6 space-y-6">
                {/* Migration Summary/Overview - Simplified Design */}
                <div className="bg-card p-6 rounded-xl border-2 border-primary/20">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Migration Summary</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Your workflow automation has been successfully converted from n8n to Lamatic format
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Workflow Name</div>
                      <div className="font-semibold text-base">{result.lamaticWorkflow?.name || 'Unnamed Workflow'}</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Processing Time</div>
                      <div className="font-semibold text-base">{Math.round((result.processingTime || 0) / 1000)} seconds</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Completed</div>
                      <div className="font-semibold text-base">{new Date().toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border-2 border-green-500/30">
                      <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                      <div className="font-bold text-xl text-green-600 dark:text-green-400">
                        {result.totalNodes > 0 ? Math.round((result.convertedNodes / result.totalNodes) * 100) : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                    <p className="text-sm leading-relaxed mb-3">
                      <strong className="text-base">In Simple Terms:</strong> Your workflow has been converted! 
                      <strong className="text-foreground"> {result.convertedNodes} out of {result.totalNodes}</strong> automation steps 
                      from your n8n workflow are now ready to use in Lamatic. You can import and use your workflow right away.
                    </p>
                    {(result.warningNodes > 0 || result.errorNodes > 0) && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm leading-relaxed">
                          <strong className="text-yellow-600 dark:text-yellow-400">⚠️ Action Required:</strong> 
                          {result.warningNodes > 0 && ` ${result.warningNodes} node${result.warningNodes > 1 ? 's need' : ' needs'} setup (like adding API keys).`}
                          {result.errorNodes > 0 && ` ${result.errorNodes} node${result.errorNodes > 1 ? 's have' : ' has'} errors that need manual review.`}
                          {' '}Check the table below to see which ones need attention, then test your workflow in Lamatic Studio before going live.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics Grid - Simplified */}
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    Migration Statistics
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Quick overview of your workflow conversion results
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl bg-muted/40 border-2 border-border">
                      <div className="text-3xl font-bold mb-1">{result.totalNodes}</div>
                      <div className="text-sm text-muted-foreground font-medium">Total Nodes</div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border-2 border-green-500/50">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{result.convertedNodes}</div>
                      <div className="text-sm text-muted-foreground font-medium">✓ Converted</div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border-2 border-border">
                      <div className="text-3xl font-bold mb-1">{result.warningNodes || 0}</div>
                      <div className="text-sm text-muted-foreground font-medium">Need Setup</div>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border-2 border-border">
                      <div className="text-3xl font-bold mb-1">{result.errorNodes || 0}</div>
                      <div className="text-sm text-muted-foreground font-medium">Errors</div>
                    </div>
                  </div>
                </div>

                {/* Credentials Required Section */}
                {(() => {
                  const credentialNodes = result.nodeResults?.filter((n: any) => 
                    n.n8nNodeType?.includes('slack') || 
                    n.n8nNodeType?.includes('gemini') ||
                    n.n8nNodeType?.includes('google') ||
                    n.message?.toLowerCase().includes('credential') ||
                    n.message?.toLowerCase().includes('auth')
                  );
                  
                  if (credentialNodes && credentialNodes.length > 0) {
                    return (
                      <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <div>Credentials Required</div>
                            <div className="text-sm font-normal text-muted-foreground">Action needed before deployment</div>
                          </div>
                        </h3>
                        
                        <div className="bg-muted/60 p-5 rounded-xl border-2 border-primary/30 mb-4">
                          <p className="text-base leading-relaxed">
                            <strong className="text-primary text-lg">⚠️ Important:</strong> The following services need authentication setup in Lamatic. 
                            Your workflow won't run until these credentials are configured.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {credentialNodes.map((node: any, i: number) => {
                            const isSlack = node.n8nNodeType?.includes('slack');
                            const isGemini = node.n8nNodeType?.includes('gemini') || node.n8nNodeType?.includes('google');
                            
                            return (
                              <div key={i} className="p-6 rounded-xl bg-card border-2 border-border hover:border-primary/40 transition-all">
                                <div className="flex items-start gap-4 mb-4">
                                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <span className="text-2xl">{isSlack ? '💬' : isGemini ? '🤖' : '🔌'}</span>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-lg mb-1">{node.n8nNodeName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {isSlack && 'Slack messaging integration'}
                                      {isGemini && 'Google Gemini AI model'}
                                      {!isSlack && !isGemini && 'External service integration'}
                                    </p>
                                  </div>
                                </div>

                                {isSlack && (
                                  <div className="space-y-3 mt-4">
                                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                      <p className="text-sm font-bold mb-2 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span>
                                        Action Required - Without this, Slack messages won't send
                                      </p>
                                    </div>
                                    
                                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                      <p className="text-sm font-bold mb-3">📝 Step-by-Step Setup:</p>
                                      
                                      <div className="space-y-3">
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Get Your Slack Token</p>
                                            <p className="text-muted-foreground">Visit <a href="https://api.slack.com/apps" target="_blank" className="text-primary underline">api.slack.com/apps</a> → Create or select your app → "OAuth & Permissions" → Copy <strong>"Bot User OAuth Token"</strong></p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Open Your Imported Workflow</p>
                                            <p className="text-muted-foreground">In Lamatic Studio, open the workflow you just imported → Find the <strong>{node.n8nNodeName}</strong> node</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Configure Credentials</p>
                                            <p className="text-muted-foreground">Click the node → Click <strong>"Configure Credentials"</strong> → Paste your Bot Token → Click <strong>"Test Connection"</strong> → Save</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                                      <p className="text-xs font-semibold flex items-center gap-2">
                                        <span>🔐</span> Required Slack Permissions:
                                      </p>
                                      <div className="flex gap-2 flex-wrap">
                                        <code className="bg-background px-2 py-1 rounded text-xs">chat:write</code>
                                        <code className="bg-background px-2 py-1 rounded text-xs">channels:read</code>
                                        <code className="bg-background px-2 py-1 rounded text-xs">users:read</code>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span><strong>Time needed:</strong> 3-5 minutes</span>
                                    </div>
                                  </div>
                                )}

                                {isGemini && (
                                  <div className="space-y-3 mt-4">
                                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                      <p className="text-sm font-bold mb-2 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span>
                                        Action Required - AI features won't work without API key
                                      </p>
                                    </div>
                                    
                                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                      <p className="text-sm font-bold mb-3">📝 Step-by-Step Setup:</p>
                                      
                                      <div className="space-y-3">
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Get Your Gemini API Key</p>
                                            <p className="text-muted-foreground">Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-primary underline">makersuite.google.com/app/apikey</a> → Click <strong>"Create API Key"</strong> → Select/create a Google Cloud project → Copy the key</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Open Your Imported Workflow</p>
                                            <p className="text-muted-foreground">In Lamatic Studio, open the workflow you just imported → Find the <strong>{node.n8nNodeName}</strong> node</p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">Add API Key to Lamatic</p>
                                            <p className="text-muted-foreground">Click the node → Click <strong>"Configure Credentials"</strong> → Paste your API Key → Click <strong>"Test API Key"</strong> → Save</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                                      <p className="text-xs font-bold flex items-center gap-2 mb-1">
                                        <span>🔐</span> Security Warning:
                                      </p>
                                      <p className="text-xs text-muted-foreground">Never share your API key publicly or commit it to version control. Treat it like a password.</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span><strong>Time needed:</strong> 2-3 minutes</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Node Conversion Table - Easy to Read */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    Node Conversion Details
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    All your n8n workflow nodes and their conversion status. This table shows what was converted and what needs attention.
                  </p>
                  
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Node Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">n8n Type</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">→</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Lamatic Type</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {result.nodeResults?.map((node: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {node.status === 'success' && (
                                    <div className="w-6 h-6 rounded-md bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                    </div>
                                  )}
                                  {node.status === 'warning' && (
                                    <div className="w-6 h-6 rounded-md bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                                      <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                  )}
                                  {node.status === 'error' && (
                                    <div className="w-6 h-6 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                      <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                    </div>
                                  )}
                                  <span className={`text-xs font-medium ${
                                    node.status === 'success' ? 'text-green-600 dark:text-green-400' :
                                    node.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {node.status === 'success' ? 'Converted' : node.status === 'warning' ? 'Needs Setup' : 'Error'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-sm text-foreground">{node.n8nNodeName}</div>
                              </td>
                              <td className="py-3 px-4">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                                  {node.n8nNodeType}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
                              </td>
                              <td className="py-3 px-4">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                                  {node.lamaticNodeType}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                {node.message ? (
                                  <div className="text-xs text-muted-foreground max-w-xs">
                                    {node.message}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Legend for non-tech users */}
                  <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-foreground mb-2">What do the statuses mean?</p>
                    <div className="grid md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span><strong className="text-foreground">Converted:</strong> Node is ready to use</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span><strong className="text-foreground">Needs Setup:</strong> Requires configuration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span><strong className="text-foreground">Error:</strong> Needs manual review</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complete Setup Guide - Detailed Steps */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Complete Setup Guide
                  </h3>

                  <div className="space-y-4">
                    {/* Step 3 - Configure Credentials (if needed) */}
                    {result.warningNodes > 0 && (
                      <div className="p-5 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center font-bold text-yellow-600 dark:text-yellow-400 text-lg">
                            3
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-base mb-2 text-yellow-700 dark:text-yellow-400">
                              ⛔ MUST FIX: Configure Credentials
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Your workflow requires authentication setup. <strong>It won't run until these are configured.</strong>
                            </p>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>1. Open your imported workflow in Lamatic</p>
                              <p>2. Click on each node that needs credentials (marked with ⚠️)</p>
                              <p>3. Click <strong className="text-foreground">Configure Credentials</strong></p>
                              <p>4. Follow the setup instructions (see Credentials Required section above for specifics)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4 - Test Your Workflow */}
                    <div className="p-5 rounded-xl bg-card border-2 border-border">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                          {result.warningNodes > 0 ? '4' : '3'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-2">🧪 Test Your Workflow</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>1. In Lamatic, click <strong className="text-foreground">Test Run</strong> button</p>
                            <p>2. Provide sample input data for testing</p>
                            <p>3. Verify each node executes correctly</p>
                            <p>4. Check that output matches your expectations</p>
                            <p>5. Review execution logs for any issues</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 5 - Deploy & Go Live */}
                    <div className="p-5 rounded-xl border-2 border-green-500/30 bg-green-500/5">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center font-bold text-green-600 dark:text-green-400 text-lg">
                          {result.warningNodes > 0 ? '5' : '4'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-base mb-2 text-green-700 dark:text-green-400">🚀 Deploy & Go Live</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>1. Activate your workflow in Lamatic</p>
                            <p>2. Update webhook URLs in your external services (if applicable)</p>
                            <p>3. Monitor initial executions closely</p>
                            <p>4. Keep your original n8n workflow as backup</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Estimate */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span>Estimated setup time: {result.warningNodes > 0 ? '10-15 minutes' : '5-8 minutes'} (including credential configuration)</span>
                    </div>
                  </div>
                </div>

                {/* Important Notes Section - Simplified */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Important Notes
                  </h3>

                  <div className="space-y-4">
                    {/* FIX #4: Migration Warnings with Priority Levels */}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="space-y-3">
                        {/* Categorize warnings by priority */}
                        {result.warnings.filter((w: string) => 
                          w.toLowerCase().includes('credential') || 
                          w.toLowerCase().includes('auth') ||
                          w.toLowerCase().includes('required')
                        ).length > 0 && (
                          <div className="p-5 rounded-xl bg-red-500/10 border-2 border-red-500/30">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                                <span className="text-lg">⛔</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-base mb-2 text-red-700 dark:text-red-400">MUST FIX (Blocks Execution)</p>
                                <div className="space-y-1">
                                  {result.warnings
                                    .filter((w: string) => 
                                      w.toLowerCase().includes('credential') || 
                                      w.toLowerCase().includes('auth') ||
                                      w.toLowerCase().includes('required')
                                    )
                                    .map((warning: string, i: number) => (
                                      <p key={i} className="text-sm leading-relaxed">• {warning}</p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Recommended warnings - Exclude technical connection warnings */}
                        {result.warnings.filter((w: string) => 
                          !w.toLowerCase().includes('missing connection') &&
                          (w.toLowerCase().includes('recommend') || 
                           w.toLowerCase().includes('consider') ||
                           (w.toLowerCase().includes('should') && !w.toLowerCase().includes('should connect to')))
                        ).length > 0 && (
                          <div className="p-5 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                                <span className="text-lg">⚠️</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-base mb-2 text-yellow-700 dark:text-yellow-400">RECOMMENDED (Workflow works but limited)</p>
                                <div className="space-y-1">
                                  {result.warnings
                                    .filter((w: string) => 
                                      !w.toLowerCase().includes('missing connection') &&
                                      (w.toLowerCase().includes('recommend') || 
                                       w.toLowerCase().includes('consider') ||
                                       (w.toLowerCase().includes('should') && !w.toLowerCase().includes('should connect to')))
                                    )
                                    .map((warning: string, i: number) => (
                                      <p key={i} className="text-sm leading-relaxed">• {warning}</p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Info/Tips - Exclude technical connection warnings */}
                        {result.warnings.filter((w: string) => 
                          !w.toLowerCase().includes('missing connection') &&
                          !w.toLowerCase().includes('credential') && 
                          !w.toLowerCase().includes('auth') &&
                          !w.toLowerCase().includes('required') &&
                          !w.toLowerCase().includes('recommend') &&
                          !w.toLowerCase().includes('consider') &&
                          !w.toLowerCase().includes('should')
                        ).length > 0 && (
                          <div className="p-5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                <span className="text-lg">ℹ️</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-base mb-2 text-blue-700 dark:text-blue-400">INFO (Nice to know)</p>
                                <div className="space-y-1">
                                  {result.warnings
                                    .filter((w: string) => 
                                      !w.toLowerCase().includes('missing connection') &&
                                      !w.toLowerCase().includes('credential') && 
                                      !w.toLowerCase().includes('auth') &&
                                      !w.toLowerCase().includes('required') &&
                                      !w.toLowerCase().includes('recommend') &&
                                      !w.toLowerCase().includes('consider') &&
                                      !w.toLowerCase().includes('should')
                                    )
                                    .map((warning: string, i: number) => (
                                      <p key={i} className="text-sm leading-relaxed">• {warning}</p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Helpful Tips */}
                    <div className="p-5 rounded-xl bg-muted/50 border-2 border-border">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">💡</span>
                        <div className="space-y-2">
                          <p className="font-bold text-base">Tips for Success</p>
                          <ul className="text-sm space-y-1.5 leading-relaxed">
                            <li>• Import the workflow file into Lamatic platform</li>
                            <li>• Set up all required credentials before testing</li>
                            <li>• Review and verify all connections manually - some may need adjustment</li>
                            <li>• Test each node individually first</li>
                            <li>• Run a complete workflow test before going live</li>
                            <li>• Keep your original n8n workflow as backup</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Deployment Considerations */}
                    <div className="p-5 rounded-xl bg-muted/50 border-2 border-border">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🚀</span>
                        <div className="space-y-2">
                          <p className="font-bold text-base">Deployment Notes</p>
                          <ul className="text-sm space-y-1.5 leading-relaxed">
                            <li>• Most workflow connections and logic have been preserved</li>
                            <li>• Node execution order is maintained</li>
                            <li>• Manual connection review recommended before deployment</li>
                            <li>• Webhook URLs will need to be updated in your external services</li>
                            <li>• Environment variables may need reconfiguration</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Connection Review Warning */}
                    {(result.warningNodes > 0 || result.errorNodes > 0) && (
                      <div className="p-5 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="font-bold text-base text-yellow-700 dark:text-yellow-400">Connection Review Required</p>
                            <p className="text-sm leading-relaxed">
                              Some workflow connections may be broken due to {result.warningNodes > 0 ? `${result.warningNodes} nodes requiring setup` : ''}{result.warningNodes > 0 && result.errorNodes > 0 ? ' and ' : ''}{result.errorNodes > 0 ? `${result.errorNodes} conversion errors` : ''}. 
                              Please manually review and test all node connections in Lamatic Studio before deploying to production. 
                              Check that data flows correctly between nodes and verify all dependencies are properly linked.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Support & Help */}
                    <div className="p-5 rounded-xl bg-muted/50 border-2 border-primary/30">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-2xl shrink-0">📞</span>
                        <div>
                          <p className="font-bold text-base mb-2">Need Help?</p>
                          <p className="text-sm leading-relaxed mb-4">
                            If you encounter any issues during migration or need assistance building your workflow:
                          </p>
                          <div className="grid md:grid-cols-3 gap-3">
                            <a
                              href="https://lamatic.ai/docs"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-sm">Documentation</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Comprehensive guides and API reference
                              </p>
                            </a>
                            <a
                              href="https://lamatic.ai/docs/slack"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <ExternalLink className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-sm">Join Slack</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Get help from community and team
                              </p>
                            </a>
                            <a
                              href="https://lamatic.ai/support"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-sm">Contact Support</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Direct support for migration issues
                              </p>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Download Markdown Only */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/50 sticky bottom-0">
                <div className="text-sm text-muted-foreground">
                  Report generated: {new Date().toLocaleString()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const markdown = generateMarkdownReport(result, originalFileName);
                      const blob = new Blob([markdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const reportBaseName = originalFileName || result.lamaticWorkflow?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'workflow';
                      a.download = `${reportBaseName}_migration-report.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-11 px-6 bg-primary text-white rounded-xl font-semibold inline-flex items-center gap-2 text-sm hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Markdown
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
