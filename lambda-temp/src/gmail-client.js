import { getGmailClient } from './gmail-auth.js';
import { Buffer } from 'buffer';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE GMAIL DRAFT (Email Format Version)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function createGmailDraft(meetingNotes, meetingTitle, meetingDate, meetingUrl = null) {
  try {
    console.log('📧 Creating Gmail draft...');
    
    const gmail = await getGmailClient();
    const emailBody = formatEmailBody(meetingNotes, meetingTitle, meetingDate, meetingUrl);
    const subject = formatSubject(meetingTitle, meetingDate);
    const message = createMimeMessage(subject, emailBody);
    
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: message,
        },
      },
    });
    
    console.log('✅ Gmail draft created successfully');
    console.log(`   Draft ID: ${res.data.id}`);
    
    return res.data;
    
  } catch (error) {
    console.error('❌ Error creating Gmail draft:', error.message);
    throw error;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMAT SUBJECT LINE
// Format: [MCA] Notes and Actions - 10.12.25
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatSubject(meetingTitle, meetingDate) {
  // Extract meeting code from title (e.g., [MCA] from "[MCA] Check-in")
  const codeMatch = meetingTitle.match(/\[([^\]]+)\]/);
  const code = codeMatch ? `[${codeMatch[1]}]` : '[Meeting]';
  
  // Format date as DD.MM.YY
  const date = new Date(meetingDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const shortDate = `${day}.${month}.${year}`;
  
  return `${code} Notes and Actions - ${shortDate}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMAT EMAIL BODY (Intro + Claude Output + Ending)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatEmailBody(meetingNotes, meetingTitle, meetingDate, meetingUrl) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      font-size: 14px;
    }
    p {
      margin: 0 0 10px 0;
    }
    h3 {
      color: #000;
      margin: 20px 0 10px 0;
      font-size: 16px;
      font-weight: bold;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      font-size: 13px;
    }
    th {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    .signature {
      margin-top: 30px;
      font-size: 14px;
      line-height: 1.4;
    }
    .signature strong {
      display: block;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <p>Hi Everyone,</p>
  
  <p>Thanks for your time today. Please find below a summary of key discussion points and action items from our recent meeting.</p>
  
  ${convertClaudeOutputToEmail(meetingNotes)}
  
  <p>Let us know if there's anything you need in the meantime. Otherwise, we'll keep things moving and circle back in the next call with fresh updates.</p>
  
  <p>Chat soon!</p>
  
  <div class="signature">
    <p><strong>Thanks</strong><br>
    Stella</p>
    
    <p>Senior Account Manager<br>
    M: 0434 892 209<br>
    Sydney</p>
  </div>
</body>
</html>
`;
  
  return html;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERT CLAUDE OUTPUT TO EMAIL FORMAT
// Converts Claude's markdown-style output to HTML email format
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function convertClaudeOutputToEmail(claudeOutput) {
  let html = '';
  
  // Split into sections by looking for section headers (with or without markdown # or **)
  const sections = claudeOutput.split(/\n\n(?=[#*]*\s*(?:Meeting Notes|Campaign Updates|Key Decisions|Action Items|Next Meeting Agenda))/);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Extract section name (first line) and content (rest)
    const firstLineEnd = trimmed.indexOf('\n');
    let sectionName = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd).trim() : trimmed;
    // Remove markdown formatting (headers # and bold **)
    sectionName = sectionName.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '');
    const content = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1).trim() : '';
    
    if (!content) {
      continue;
    }
    
    if (sectionName === 'Meeting Notes' || 
        sectionName === 'Key Decisions') {
      
      // Convert to bullet points (split by double newlines for paragraphs)
      html += `<h3>${sectionName}</h3>\n<ul>\n`;
      
      const paragraphs = content.split(/\n\n+/);
      
      for (const para of paragraphs) {
        const cleaned = para.trim()
          .replace(/^[-•]\s*/, '')
          .replace(/[,.]$/, '');
        
        if (cleaned) {
          html += `<li>${escapeHtml(cleaned)}.</li>\n`;
        }
      }
      
      html += '</ul>\n';
      
    } else if (sectionName === 'Campaign Updates, Metrics, and Performance' || 
               sectionName === 'Campaign Updates') {
      
      // Campaign updates are single-line items ending with commas
      html += `<h3>Campaign Updates, Metrics, and Performance</h3>\n<ul>\n`;
      
      const lines = content.split(/\n/);
      
      for (const line of lines) {
        const cleaned = line.trim()
          .replace(/^[-•]\s*/, '')
          .replace(/[,.]$/, '');
        
        if (cleaned) {
          html += `<li>${escapeHtml(cleaned)}.</li>\n`;
        }
      }
      
      html += '</ul>\n';
      
    } else if (sectionName === 'Action Items') {
      
      // Convert markdown table to HTML table
      html += `<h3>Actions</h3>\n`;
      html += convertActionItemsTable(content);
      
    }
    // Skip "Next Meeting Agenda" - not needed in email format
  }
  
  return html;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERT ACTION ITEMS TABLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function convertActionItemsTable(content) {
  const lines = content.split('\n').filter(line => line.trim() && !line.includes('---'));
  
  if (lines.length < 2) {
    return '';
  }
  
  // Skip header row (| Responsible Person | Action Item | Due Date |)
  const dataRows = lines.slice(1);
  
  let html = '<table style="border-collapse: collapse; margin: 15px 0; font-size: 13px;">\n';
  html += '<tr><th style="background-color: #f0f0f0; border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-weight: bold;">Item</th><th style="background-color: #f0f0f0; border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-weight: bold;">Owner</th><th style="background-color: #f0f0f0; border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-weight: bold;">Due by</th></tr>\n';
  
  for (const row of dataRows) {
    if (!row.trim() || !row.includes('|')) continue;
    
    const cells = row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell);
    
    if (cells.length >= 2) {
      const owner = cells[0] || '';
      const item = cells[1] || '';
      const due = cells[2] || '';
      
      html += '<tr>';
      html += `<td style="border: 1px solid #ccc; padding: 8px 12px; text-align: left;">${escapeHtml(item)}</td>`;
      html += `<td style="border: 1px solid #ccc; padding: 8px 12px; text-align: left;">${escapeHtml(owner)}</td>`;
      html += `<td style="border: 1px solid #ccc; padding: 8px 12px; text-align: left;">${escapeHtml(due)}</td>`;
      html += '</tr>\n';
    }
  }
  
  html += '</table>\n';
  
  return html;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE MIME MESSAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createMimeMessage(subject, htmlBody) {
  const messageParts = [
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ];
  
  const message = messageParts.join('\n');
  
  // Encode in base64url format
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return encodedMessage;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESCAPE HTML
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
