"use client";

import { useState, useRef, useEffect } from 'react';
import { Upload, Download, RefreshCw, Check, AlertCircle, XCircle, ArrowRight, FileText, Github, ExternalLink, Database, Zap, Workflow, Sparkles, ArrowUpRight, X, Clock, Activity, FileDown, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// PDF generation helper - Minimalist, clean design
// Generate Markdown report for Notion users
const generateMarkdownReport = (result: any): string => {
  const workflowName = result.lamaticWorkflow?.name || 'Workflow';
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  let markdown = `# 📊 n8n to Lamatic Migration Report\n\n`;
  markdown += `**Workflow:** ${workflowName}\n`;
  markdown += `**Migration Date:** ${date} at ${time}\n`;
  markdown += `**Processing Time:** ${Math.round((result.processingTime || 0) / 1000)}s\n\n`;
  markdown += `---\n\n`;
  
  // Quick Summary
  markdown += `## ✅ Quick Summary\n\n`;
  markdown += `- **Total Nodes:** ${result.totalNodes}\n`;
  markdown += `- **Successfully Migrated:** ${result.convertedNodes}\n`;
  markdown += `- **Warnings:** ${result.warningNodes || 0}\n`;
  markdown += `- **Success Rate:** ${result.totalNodes > 0 ? Math.round((result.convertedNodes / result.totalNodes) * 100) : 0}%\n\n`;
  markdown += `---\n\n`;
  
  // What's Next
  markdown += `## 🚀 What's Next?\n\n`;
  markdown += `Follow these steps to complete your workflow migration:\n\n`;
  
  markdown += `### Step 1: Open Lamatic Studio\n`;
  markdown += `Navigate to [studio.lamatic.ai](https://studio.lamatic.ai) in your browser\n\n`;
  
  markdown += `### Step 2: Import Your Workflow\n`;
  markdown += `**Copy-Paste Method (Easiest):**\n`;
  markdown += `1. Open your downloaded file in any text editor\n`;
  markdown += `2. Select all content (Ctrl+A or Cmd+A) and copy\n`;
  markdown += `3. In Lamatic Studio, click the **"Config"** toggle (top-right)\n`;
  markdown += `4. Paste the JSON content into the editor\n`;
  markdown += `5. Click **"Save"** button\n`;
  markdown += `6. Done! Your workflow is now imported ✅\n\n`;
  
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
  
  // Testing
  markdown += `### Step ${result.warningNodes > 0 ? '4' : '3'}: 🧪 Test Your Workflow\n`;
  markdown += `1. In Lamatic, click **"Test Run"** button\n`;
  markdown += `2. Provide sample input data for testing\n`;
  markdown += `3. Verify each node executes correctly\n`;
  markdown += `4. Check that output matches your expectations\n`;
  markdown += `5. Review execution logs for any issues\n\n`;
  
  // Deploy
  markdown += `### Step ${result.warningNodes > 0 ? '5' : '4'}: 🚀 Deploy & Go Live\n`;
  markdown += `1. Activate your workflow in Lamatic\n`;
  markdown += `2. Update webhook URLs in your external services (if applicable)\n`;
  markdown += `3. Monitor initial executions closely\n`;
  markdown += `4. Keep your original n8n workflow as backup\n\n`;
  
  markdown += `⏱️ **Total estimated time:** ${result.warningNodes > 0 ? '10-15' : '5-8'} minutes\n\n`;
  markdown += `---\n\n`;
  
  // Node Details
  markdown += `## 📋 Node Conversion Details\n\n`;
  result.nodeResults?.forEach((node: any, i: number) => {
    const statusEmoji = node.status === 'success' ? '✅' : node.status === 'warning' ? '⚠️' : '❌';
    markdown += `${i + 1}. ${statusEmoji} **${node.n8nNodeName}**\n`;
    markdown += `   - Type: \`${node.n8nNodeType}\` → \`${node.lamaticNodeType}\`\n`;
    markdown += `   - Status: ${node.status}\n`;
    if (node.message) {
      markdown += `   - Note: ${node.message}\n`;
    }
    markdown += `\n`;
  });
  
  markdown += `---\n\n`;
  
  // Tips
  markdown += `## 💡 Tips for Success\n\n`;
  markdown += `- Test each node individually before running the full workflow\n`;
  markdown += `- Set up all required credentials before testing\n`;
  markdown += `- Keep your original n8n workflow as backup\n`;
  markdown += `- Monitor logs during initial executions\n\n`;
  
  // Support
  markdown += `## 📞 Need Help?\n\n`;
  markdown += `Visit [Lamatic Documentation](https://lamatic.ai/docs) for detailed guides.\n\n`;
  
  markdown += `---\n\n`;
  markdown += `*Report generated by n8n to Lamatic Migration Tool*\n`;
  
  return markdown;
};

const generatePDF = async (result: any, reportElement?: HTMLElement | null) => {
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
    // OVERVIEW - Single line, clean
    // ==========================================
    checkPageBreak(15);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Workflow Overview', margin, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${result.lamaticWorkflow?.name || 'Unnamed Workflow'}`, margin, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text(`Successfully converted ${result.convertedNodes} of ${result.totalNodes} nodes (${successRate}% complete)`, margin, yPos);
    yPos += 12;

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
        checkPageBreak(20);
        const isSlack = node.n8nNodeType?.includes('slack');
        const isGemini = node.n8nNodeType?.includes('gemini') || node.n8nNodeType?.includes('google');
        
        // Node name
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
          pdf.text('Service: Slack', margin + 6, yPos);
          yPos += 4;
          pdf.text('Setup: api.slack.com/apps > OAuth & Permissions > Copy Bot Token', margin + 6, yPos);
          yPos += 4;
          pdf.text('Add to: Lamatic Slack node credentials', margin + 6, yPos);
        } else if (isGemini) {
          pdf.text('Service: Google Gemini', margin + 6, yPos);
          yPos += 4;
          pdf.text('Setup: makersuite.google.com/app/apikey > Create API Key', margin + 6, yPos);
          yPos += 4;
          pdf.text('Add to: Lamatic Google Gemini node credentials', margin + 6, yPos);
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
    // NODE CONVERSION DETAILS - Simple table
    // ==========================================
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.text('Converted Nodes', margin, yPos);
    yPos += 7;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    pdf.text('All nodes have been successfully mapped to Lamatic equivalents:', margin, yPos);
    yPos += 8;

    result.nodeResults?.forEach((node: any, i: number) => {
      checkPageBreak(8);
      
      const isSuccess = node.status === 'success';
      
      // Simple list with dash
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.text('-', margin + 3, yPos);
      pdf.text(node.n8nNodeName, margin + 7, yPos);
      
      // Show conversion
      pdf.setFontSize(8);
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.text(`(${node.lamaticNodeType})`, margin + 7, yPos + 3.5);
      
      yPos += 7;
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

    // Step 2
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
    pdf.text('3. In Lamatic Studio, click the "Config" toggle (top-right)', margin, yPos);
    yPos += 4;
    pdf.text('4. Paste the JSON content into the editor', margin, yPos);
    yPos += 4;
    pdf.text('5. Click "Save" button', margin, yPos);
    yPos += 4;
    pdf.text('6. Done! Your workflow is now imported', margin, yPos);
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

    // Download
    const filename = `n8n-lamatic-report-${result.lamaticWorkflow?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'workflow'}.pdf`;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger card appearance animation
  useEffect(() => {
    if (view === 'choose') {
      setTimeout(() => setCardsVisible(true), 100);
    } else {
      setCardsVisible(false);
    }
  }, [view]);

  const handleFile = async (file: File) => {
    if (!file || !file.name.endsWith('.json')) return;

    setView('processing');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

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
        body: formData,
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
    } catch (error) {
      console.error('Migration failed:', error);
      setView('choose');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadFile = () => {
    if (!result?.lamaticWorkflow) return;
    const blob = new Blob([JSON.stringify(result.lamaticWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.lamaticWorkflow.name.replace(/\s+/g, '_')}.json`;
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
      <main className="flex-1 max-w-6xl mx-auto px-6 lg:px-8 py-6 md:py-8 w-full">
        
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

            {/* FIX #1: Post-Migration Steps - Clear Next Actions */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">What's Next?</h2>
                  <p className="text-sm text-muted-foreground">Follow these steps to complete your workflow migration</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-card border-2 border-border hover:border-primary/30 transition-all group">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                      Open Lamatic Studio
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('https://studio.lamatic.ai');
                          alert('URL copied to clipboard!');
                        }}
                        className="ml-auto text-xs px-2 py-1 bg-muted rounded hover:bg-primary/10 transition-colors"
                      >
                        📋 Copy URL
                      </button>
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Navigate to <a href="https://studio.lamatic.ai" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">studio.lamatic.ai</a> in your browser
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-card border-2 border-border hover:border-primary/30 transition-all">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                      Import Your Workflow
                      <button
                        onClick={() => {
                          const workflowName = result.lamaticWorkflow?.name || 'workflow';
                          navigator.clipboard.writeText(workflowName);
                          alert('Workflow name copied!');
                        }}
                        className="ml-auto text-xs px-2 py-1 bg-muted rounded hover:bg-primary/10 transition-colors"
                      >
                        📋 Copy Name
                      </button>
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="font-semibold text-foreground">📋 Copy-Paste Method (Easiest):</p>
                      <div className="pl-3 space-y-1">
                        <p>1. Open your downloaded file in any text editor</p>
                        <p>2. Select all content (<code className="bg-muted px-1.5 py-0.5 rounded text-xs">Ctrl+A</code> or <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Cmd+A</code>) and copy</p>
                        <p>3. In Lamatic Studio, click the <strong className="text-foreground">"Config"</strong> toggle (top-right)</p>
                        <p>4. Paste the JSON content into the editor</p>
                        <p>5. Click <strong className="text-foreground">"Save"</strong> button</p>
                        <p>6. Done! Your workflow is now imported ✅</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 - Conditional based on warnings */}
                {result.warningNodes > 0 && (
                  <div className="flex items-start gap-4 p-5 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-all">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center font-bold text-yellow-600 dark:text-yellow-400 text-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-2 text-yellow-700 dark:text-yellow-400">
                        ⛔ MUST FIX: Configure Credentials
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Your workflow requires authentication setup. <strong>It won't run until these are configured.</strong>
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>1. Open your imported workflow in Lamatic</p>
                        <p>2. Click on each node that needs credentials (marked with ⚠️)</p>
                        <p>3. Click <strong className="text-foreground">Configure Credentials</strong></p>
                        <p>4. Follow the setup instructions (see Detailed Report for specifics)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                <div className="flex items-start gap-4 p-5 rounded-xl bg-card border-2 border-border hover:border-primary/30 transition-all">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                    {result.warningNodes > 0 ? '4' : '3'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2">🧪 Test Your Workflow</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>1. In Lamatic, click <strong className="text-foreground">Test Run</strong> button</p>
                      <p>2. Provide sample input data for testing</p>
                      <p>3. Verify each node executes correctly</p>
                      <p>4. Check that output matches your expectations</p>
                      <p>5. Review execution logs for any issues</p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start gap-4 p-5 rounded-xl border-2 border-green-500/30 bg-green-500/5 hover:border-green-500/50 transition-all">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center font-bold text-green-600 dark:text-green-400 text-lg">
                    {result.warningNodes > 0 ? '5' : '4'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2 text-green-700 dark:text-green-400">🚀 Deploy & Go Live</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>1. Activate your workflow in Lamatic</p>
                      <p>2. Update webhook URLs in your external services (if applicable)</p>
                      <p>3. Monitor initial executions closely</p>
                      <p>4. Keep your original n8n workflow as backup</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Time Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>Estimated setup time: {result.warningNodes > 0 ? '10-15 minutes' : '5-8 minutes'} (including credential configuration)</span>
              </div>
            </div>

            {/* Quick Node List - Expandable */}
            <details className="group/details">
              <summary className="cursor-pointer list-none p-3 border-2 border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">View all {result.nodeResults?.length} migrated nodes</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-open/details:rotate-90 transition-transform" />
                </div>
              </summary>
              <div className="mt-3 space-y-2 modal-scroll max-h-96 overflow-y-auto">
                {result.nodeResults?.map((node: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-card transition-all"
                  >
                    <div className="shrink-0">
                      {node.status === 'success' && (
                        <div className="w-6 h-6 rounded-md bg-green-500/15 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      {node.status === 'warning' && (
                        <div className="w-6 h-6 rounded-md bg-yellow-500/15 flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      )}
                      {node.status === 'error' && (
                        <div className="w-6 h-6 rounded-md bg-red-500/15 flex items-center justify-center">
                          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{node.n8nNodeName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
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
                Upload your n8n JSON workflow file for instant conversion to Lamatic format
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`
                drop-zone cursor-pointer relative
                border-2 border-dashed rounded-2xl p-12 text-center
                ${dragActive ? 'active' : 'border-border'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 transition-all">
                <Upload className="w-8 h-8 text-primary" />
              </div>

              <h3 className="text-xl font-semibold mb-2">
                Drop workflow file here
              </h3>
              <p className="text-sm text-muted-foreground mb-8 font-light">
                or click to browse your files
              </p>

              <div className="inline-flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <span>JSON format</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>Max 10MB</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>Instant conversion</span>
              </div>
            </div>
          </div>
        )}

        {/* Choose State */}
        {view === 'choose' && (
          <div className="animate-slide-up">
            {/* Hero */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-border bg-muted/30 mb-5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="label">Migration Tool</span>
              </div>

              <h1 className="mb-4 !leading-tight">
                Convert n8n to Lamatic
              </h1>

              <p className="description mx-auto max-w-2xl">
                Seamlessly migrate your automation workflows with intelligent node mapping and dependency resolution
              </p>
            </div>

            {/* Migration Options - Modern Rectangular Cards */}
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto mb-12">
              {/* File Upload Option - PRIMARY (Subtle Premium) */}
              <button
                onClick={() => setView('upload')}
                className={`
                  migration-card-primary group text-left p-7 rounded-2xl relative
                  ${cardsVisible ? 'card-appear' : 'opacity-0'}
                `}
                style={{ animationDelay: '0.1s' }}
              >
                {/* Subtle mesh gradient background */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent opacity-60" />
                
                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon - Compact */}
                  <div className="icon-container shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold mb-1.5">Upload Workflow</h3>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
                      Convert n8n JSON files instantly with intelligent node mapping
                    </p>
                    
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <span>Get started</span>
                      <ArrowRight className="w-4 h-4 arrow-slide" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Bulk Migration Option - SECONDARY (Coming Soon) */}
              <div 
                className={`
                  migration-card-secondary p-7 rounded-2xl relative
                  ${cardsVisible ? 'card-appear' : 'opacity-0'}
                `}
                style={{ animationDelay: '0.2s' }}
              >
                <div className="absolute top-6 right-6 z-20">
                  <div className="px-2.5 py-1 rounded-md bg-muted/80 border border-border text-xs font-medium text-muted-foreground">
                    Soon
                  </div>
                </div>
                
                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon - Muted */}
                  <div className="icon-container shrink-0 w-12 h-12 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center">
                    <Database className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold mb-1.5 text-muted-foreground/80">Bulk Migration</h3>
                    <p className="text-sm text-muted-foreground/60 font-light leading-relaxed mb-4">
                      Migrate multiple workflows via API integration automatically
                    </p>
                    
                    <div className="flex items-center gap-2 text-muted-foreground/60 font-medium text-sm">
                      <Zap className="w-4 h-4" />
                      <span>API powered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features - Minimal */}
            <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="feature-card text-center p-6">
                <div className="icon-container w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Workflow className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">Smart Mapping</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Intelligent node conversion with parameter optimization
                </p>
              </div>

              <div className="feature-card text-center p-6">
                <div className="icon-container w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">Instant Processing</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Fast conversion with real-time progress tracking
                </p>
              </div>

              <div className="feature-card text-center p-6">
                <div className="icon-container w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">Production Ready</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Download deployment-ready Lamatic workflows
                </p>
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
                    <p className="text-sm leading-relaxed">
                      <strong className="text-base">What this means:</strong> All {result.totalNodes} automation nodes from your n8n workflow 
                      have been converted to Lamatic format. Your workflow logic, connections, and automation flows 
                      are ready to use in Lamatic.
                    </p>
                  </div>
                </div>

                {/* Statistics Grid - Simplified */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    Migration Statistics
                  </h3>
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

                {/* Detailed Node Conversion List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Node Conversion Details</h3>
                  <div className="space-y-3">
                    {result.nodeResults?.map((node: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className="shrink-0 mt-0.5">
                            {node.status === 'success' && (
                              <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            {node.status === 'warning' && (
                              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              </div>
                            )}
                            {node.status === 'error' && (
                              <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Node Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <div className="font-semibold text-base">{node.n8nNodeName}</div>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                node.status === 'success' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                                node.status === 'warning' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                                'bg-red-500/20 text-red-700 dark:text-red-400'
                              }`}>
                                {node.status}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              <span className="font-mono text-xs">{node.n8nNodeType}</span>
                              <ArrowRight className="w-3 h-3 inline mx-1" />
                              <span className="font-mono text-xs">{node.lamaticNodeType}</span>
                            </div>
                            {node.message && (
                              <div className="text-sm text-muted-foreground mt-2 p-2 rounded bg-muted/50">
                                {node.message}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                        
                        {/* Recommended warnings */}
                        {result.warnings.filter((w: string) => 
                          w.toLowerCase().includes('recommend') || 
                          w.toLowerCase().includes('consider') ||
                          w.toLowerCase().includes('should')
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
                                      w.toLowerCase().includes('recommend') || 
                                      w.toLowerCase().includes('consider') ||
                                      w.toLowerCase().includes('should')
                                    )
                                    .map((warning: string, i: number) => (
                                      <p key={i} className="text-sm leading-relaxed">• {warning}</p>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Info/Tips */}
                        {result.warnings.filter((w: string) => 
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
                            <li>• All workflow connections and logic have been preserved</li>
                            <li>• Node execution order is maintained</li>
                            <li>• Webhook URLs will need to be updated in your external services</li>
                            <li>• Environment variables may need reconfiguration</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Support */}
                    <div className="p-5 rounded-xl bg-muted/50 border-2 border-primary/30">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">📞</span>
                        <div>
                          <p className="font-bold text-base mb-2">Need Help?</p>
                          <p className="text-sm leading-relaxed">
                            Visit <a href="https://lamatic.ai/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold hover:text-primary/80">Lamatic Documentation</a> or 
                            contact support if you need assistance with the migration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - PDF Export Only */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/50 sticky bottom-0">
                <div className="text-sm text-muted-foreground">
                  Report generated: {new Date().toLocaleString()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => generatePDF(result)}
                    className="h-11 px-6 bg-primary text-white rounded-xl font-semibold inline-flex items-center gap-2 text-sm hover:shadow-xl hover:shadow-primary/25 hover:scale-105 transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      const markdown = generateMarkdownReport(result);
                      navigator.clipboard.writeText(markdown);
                      alert('✅ Report copied as Markdown! Paste it in Notion.');
                    }}
                    className="h-11 px-6 border-2 border-primary/30 bg-card text-foreground rounded-xl font-semibold inline-flex items-center gap-2 text-sm hover:bg-primary/5 hover:border-primary/60 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Copy as Markdown
                  </button>
                  <button
                    onClick={() => setShowReport(false)}
                    className="h-11 px-5 border-2 border-border rounded-xl font-semibold text-sm hover:bg-muted transition-all"
                  >
                    Close
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
