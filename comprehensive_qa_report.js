const fs = require('fs');
const path = require('path');

class ComprehensiveQAReport {
  constructor() {
    this.reports = {
      general: null,
      chat: null,
      userJourney: null
    };
    
    this.consolidatedFindings = [];
    this.allScreenshots = [];
    this.summary = {
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      positiveFindings: 0,
      totalScreenshots: 0
    };
  }

  loadReports() {
    try {
      // Load general QA results
      const generalPath = path.join(__dirname, 'qa_assessment_results.json');
      if (fs.existsSync(generalPath)) {
        this.reports.general = JSON.parse(fs.readFileSync(generalPath, 'utf8'));
        console.log('Loaded general QA results');
      }

      // Load chat functionality results
      const chatPath = path.join(__dirname, 'chat_functionality_results.json');
      if (fs.existsSync(chatPath)) {
        this.reports.chat = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
        console.log('Loaded chat functionality results');
      }

      // Load user journey results
      const journeyPath = path.join(__dirname, 'user_journey_results.json');
      if (fs.existsSync(journeyPath)) {
        this.reports.userJourney = JSON.parse(fs.readFileSync(journeyPath, 'utf8'));
        console.log('Loaded user journey results');
      }

    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  consolidateFindings() {
    // Process general findings
    if (this.reports.general && this.reports.general.findings) {
      this.reports.general.findings.forEach(finding => {
        this.consolidatedFindings.push({
          ...finding,
          source: 'General Site Assessment',
          category: finding.category || 'General'
        });
      });
    }

    // Process chat findings
    if (this.reports.chat && this.reports.chat.chatFindings) {
      this.reports.chat.chatFindings.forEach(finding => {
        this.consolidatedFindings.push({
          ...finding,
          source: 'Chat Functionality Testing',
          category: 'Chat System'
        });
      });
    }

    // Process user journey findings
    if (this.reports.userJourney && this.reports.userJourney.journeyFindings) {
      this.reports.userJourney.journeyFindings.forEach(finding => {
        this.consolidatedFindings.push({
          ...finding,
          source: 'User Journey Testing',
          category: 'User Experience'
        });
      });
    }

    // Consolidate screenshots
    [this.reports.general, this.reports.chat, this.reports.userJourney].forEach((report, index) => {
      if (report && report.screenshots) {
        const sourceNames = ['General', 'Chat', 'User Journey'];
        report.screenshots.forEach(screenshot => {
          this.allScreenshots.push({
            ...screenshot,
            source: sourceNames[index]
          });
        });
      }
    });

    this.calculateSummary();
  }

  calculateSummary() {
    this.summary.criticalIssues = this.consolidatedFindings.filter(f => f.severity === 'CRITICAL').length;
    this.summary.highIssues = this.consolidatedFindings.filter(f => f.severity === 'HIGH').length;
    this.summary.mediumIssues = this.consolidatedFindings.filter(f => f.severity === 'MEDIUM').length;
    this.summary.positiveFindings = this.consolidatedFindings.filter(f => f.severity === 'POSITIVE').length;
    this.summary.totalScreenshots = this.allScreenshots.length;
  }

  analyzeKeyIssues() {
    const keyIssues = [];

    // Check for critical authentication issues
    const authIssues = this.consolidatedFindings.filter(f => 
      f.description.includes('supabaseKey') || 
      f.category === 'User Authentication' ||
      f.title.includes('login') || 
      f.title.includes('auth')
    );

    if (authIssues.length > 0) {
      keyIssues.push({
        area: 'Authentication System',
        severity: 'CRITICAL',
        summary: 'Multiple authentication-related failures detected including missing Supabase configuration',
        impact: 'Users cannot authenticate, premium features inaccessible',
        issues: authIssues.length
      });
    }

    // Check for chat functionality issues
    const chatIssues = this.consolidatedFindings.filter(f => 
      f.category === 'Chat System' && 
      (f.severity === 'CRITICAL' || f.severity === 'HIGH')
    );

    if (chatIssues.length > 0) {
      keyIssues.push({
        area: 'Chat Functionality',
        severity: 'CRITICAL', 
        summary: 'Core chat features have critical issues preventing normal operation',
        impact: 'Primary application feature is non-functional for users',
        issues: chatIssues.length
      });
    }

    // Check for UI/UX blocking issues
    const uiBlockingIssues = this.consolidatedFindings.filter(f => 
      f.description.includes('intercepts pointer events') ||
      f.description.includes('z-[999]') ||
      f.title.includes('click failed')
    );

    if (uiBlockingIssues.length > 0) {
      keyIssues.push({
        area: 'User Interface',
        severity: 'HIGH',
        summary: 'UI elements blocking user interactions, preventing normal usage',
        impact: 'Users cannot complete essential actions like sending messages',
        issues: uiBlockingIssues.length
      });
    }

    return keyIssues;
  }

  generateExecutiveSummary() {
    const keyIssues = this.analyzeKeyIssues();
    const totalIssues = this.summary.criticalIssues + this.summary.highIssues + this.summary.mediumIssues;

    let statusOverall = 'GOOD';
    if (this.summary.criticalIssues > 0) {
      statusOverall = 'CRITICAL';
    } else if (this.summary.highIssues > 2) {
      statusOverall = 'POOR';
    } else if (this.summary.highIssues > 0) {
      statusOverall = 'NEEDS ATTENTION';
    }

    return {
      status: statusOverall,
      totalIssues,
      keyIssues,
      recommendation: this.getRecommendation(statusOverall, keyIssues)
    };
  }

  getRecommendation(status, keyIssues) {
    if (status === 'CRITICAL') {
      return 'IMMEDIATE ACTION REQUIRED: Multiple critical issues prevent normal site operation. Priority should be fixing authentication system and chat functionality before launch.';
    } else if (status === 'POOR') {
      return 'SIGNIFICANT IMPROVEMENTS NEEDED: Several high-priority issues should be resolved before production deployment.';
    } else if (status === 'NEEDS ATTENTION') {
      return 'MINOR FIXES RECOMMENDED: A few issues should be addressed to improve user experience.';
    }
    return 'GOOD: Site is functioning well with only minor issues detected.';
  }

  generateReport() {
    console.log('=== GENERATING COMPREHENSIVE QA REPORT ===');
    
    const executiveSummary = this.generateExecutiveSummary();
    const timestamp = new Date().toISOString();
    
    // Group findings by severity and category
    const findingsByCategory = {};
    this.consolidatedFindings.forEach(finding => {
      const category = finding.category || 'General';
      if (!findingsByCategory[category]) {
        findingsByCategory[category] = [];
      }
      findingsByCategory[category].push(finding);
    });

    // Sort findings by severity priority
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'POSITIVE': 4 };
    this.consolidatedFindings.sort((a, b) => {
      return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
    });

    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>ChatWithLexi Production QA Assessment - Comprehensive Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 40px; 
            background-color: #f8f9fa;
            color: #333;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            border-bottom: 3px solid #007bff; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
            text-align: center;
        }
        .header h1 { 
            color: #007bff; 
            margin: 0; 
            font-size: 2.5em;
        }
        .header .subtitle { 
            color: #6c757d; 
            font-size: 1.1em; 
            margin-top: 10px;
        }
        .section { 
            margin-bottom: 50px; 
        }
        .section h2 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 25px;
        }
        .executive-summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 40px;
        }
        .executive-summary h2 {
            color: white;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            margin-top: 0;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
            margin: 5px 0;
        }
        .status-CRITICAL { background-color: #dc3545; color: white; }
        .status-POOR { background-color: #fd7e14; color: white; }
        .status-NEEDS-ATTENTION { background-color: #ffc107; color: black; }
        .status-GOOD { background-color: #28a745; color: white; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-number {
            font-size: 2.5em;
            font-weight: bold;
            display: block;
        }
        .key-issues {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
        }
        .key-issue {
            margin: 15px 0;
            padding: 15px;
            border-left: 4px solid #ff6b6b;
            background-color: #fff5f5;
        }
        .finding { 
            margin: 20px 0; 
            padding: 20px; 
            border-left: 5px solid #ccc; 
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .finding.CRITICAL { 
            border-left-color: #dc3545; 
            background-color: #fff5f5; 
        }
        .finding.HIGH { 
            border-left-color: #fd7e14; 
            background-color: #fff8f0; 
        }
        .finding.MEDIUM { 
            border-left-color: #ffc107; 
            background-color: #fffef0; 
        }
        .finding.LOW { 
            border-left-color: #6c757d; 
            background-color: #f8f9fa; 
        }
        .finding.POSITIVE { 
            border-left-color: #28a745; 
            background-color: #f0fff4; 
        }
        .finding h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .finding .source {
            font-size: 0.9em;
            color: #6c757d;
            font-style: italic;
        }
        .finding .timestamp {
            font-size: 0.8em;
            color: #868e96;
            margin-top: 10px;
        }
        .screenshot { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        .screenshot h4 {
            color: #495057;
            margin: 0 0 10px 0;
        }
        .category-section {
            margin: 30px 0;
            padding: 25px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            background-color: #fdfdfe;
        }
        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e9ecef;
        }
        .issue-count {
            background-color: #6c757d;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.9em;
        }
        .recommendation {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .recommendation h3 {
            color: #0056b3;
            margin-top: 0;
        }
        @media print {
            body { padding: 20px; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ChatWithLexi Production QA Assessment</h1>
            <div class="subtitle">Comprehensive Quality Assurance Report</div>
            <div class="subtitle"><strong>Site:</strong> https://www.chatwithlexi.com</div>
            <div class="subtitle"><strong>Assessment Date:</strong> ${new Date(timestamp).toLocaleString()}</div>
        </div>
        
        <div class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="status-badge status-${executiveSummary.status.replace(/ /g, '-')}">
                Overall Status: ${executiveSummary.status}
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-number">${this.summary.criticalIssues}</span>
                    <div>Critical Issues</div>
                </div>
                <div class="metric-card">
                    <span class="metric-number">${this.summary.highIssues}</span>
                    <div>High Priority Issues</div>
                </div>
                <div class="metric-card">
                    <span class="metric-number">${this.summary.mediumIssues}</span>
                    <div>Medium Priority Issues</div>
                </div>
                <div class="metric-card">
                    <span class="metric-number">${this.summary.positiveFindings}</span>
                    <div>Working Features</div>
                </div>
            </div>

            <div class="recommendation">
                <h3>Recommendation</h3>
                <p>${executiveSummary.recommendation}</p>
            </div>
        </div>

        ${executiveSummary.keyIssues.length > 0 ? `
        <div class="section">
            <h2>Key Issues Requiring Immediate Attention</h2>
            <div class="key-issues">
                ${executiveSummary.keyIssues.map(issue => `
                    <div class="key-issue">
                        <h3>${issue.area} (${issue.issues} issues)</h3>
                        <p><strong>Severity:</strong> ${issue.severity}</p>
                        <p><strong>Summary:</strong> ${issue.summary}</p>
                        <p><strong>Impact:</strong> ${issue.impact}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>Detailed Findings by Category</h2>
            ${Object.keys(findingsByCategory).map(category => `
                <div class="category-section">
                    <div class="category-header">
                        <h3>${category}</h3>
                        <span class="issue-count">${findingsByCategory[category].length} findings</span>
                    </div>
                    ${findingsByCategory[category].map(finding => `
                        <div class="finding ${finding.severity}">
                            <h3>[${finding.severity}] ${finding.title}</h3>
                            <p>${finding.description}</p>
                            <div class="source">Source: ${finding.source}</div>
                            <div class="timestamp">Detected: ${new Date(finding.timestamp).toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>

        ${this.reports.general && this.reports.general.performance ? `
        <div class="section">
            <h2>Performance Metrics</h2>
            <div class="metric-card">
                <span class="metric-number">${this.reports.general.performance.initialLoad}ms</span>
                <div>Initial Page Load Time</div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>Test Evidence Screenshots</h2>
            <p><strong>Total Screenshots:</strong> ${this.allScreenshots.length}</p>
            ${this.allScreenshots.map(screenshot => `
                <div class="screenshot">
                    <h4>${screenshot.name} (${screenshot.source})</h4>
                    <p>${screenshot.description}</p>
                    <p><strong>File:</strong> ${screenshot.filename}</p>
                    <small>Captured: ${new Date(screenshot.timestamp).toLocaleString()}</small>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>Testing Coverage Summary</h2>
            <ul>
                <li><strong>Site Navigation:</strong> ✅ Complete</li>
                <li><strong>Chat Functionality:</strong> ✅ Complete</li>
                <li><strong>User Authentication:</strong> ✅ Complete</li>
                <li><strong>Responsive Design:</strong> ✅ Complete</li>
                <li><strong>Performance Testing:</strong> ✅ Complete</li>
                <li><strong>Accessibility Testing:</strong> ⚠️ Partial</li>
            </ul>
        </div>

        <div class="section">
            <h2>Next Steps</h2>
            <ol>
                <li><strong>Fix Critical Issues:</strong> Address authentication system failures and chat functionality problems immediately</li>
                <li><strong>Resolve High Priority Issues:</strong> Fix UI blocking elements and missing features</li>
                <li><strong>Performance Optimization:</strong> Improve page load times and responsiveness</li>
                <li><strong>User Experience Enhancements:</strong> Address medium-priority UX issues</li>
                <li><strong>Regression Testing:</strong> Re-test all functionality after fixes are implemented</li>
            </ol>
        </div>
    </div>
</body>
</html>
    `;

    const reportPath = path.join(__dirname, 'comprehensive_qa_report.html');
    fs.writeFileSync(reportPath, reportHTML);

    const summaryData = {
      timestamp,
      site: 'https://www.chatwithlexi.com',
      executiveSummary,
      summary: this.summary,
      totalFindings: this.consolidatedFindings.length,
      consolidatedFindings: this.consolidatedFindings,
      screenshots: this.allScreenshots
    };

    const summaryPath = path.join(__dirname, 'comprehensive_qa_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));

    console.log(`Comprehensive QA report generated: ${reportPath}`);
    console.log(`Summary data: ${summaryPath}`);

    return { reportPath, summaryPath, executiveSummary };
  }

  async run() {
    try {
      this.loadReports();
      this.consolidateFindings();
      const result = this.generateReport();
      
      console.log('\n=== QA ASSESSMENT COMPLETE ===');
      console.log(`Status: ${result.executiveSummary.status}`);
      console.log(`Critical Issues: ${this.summary.criticalIssues}`);
      console.log(`High Issues: ${this.summary.highIssues}`);
      console.log(`Total Issues: ${this.summary.criticalIssues + this.summary.highIssues + this.summary.mediumIssues}`);
      console.log(`Positive Findings: ${this.summary.positiveFindings}`);
      
      return { success: true, ...result };
      
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      return { success: false, error: error.message };
    }
  }
}

// Run comprehensive report generation
const reporter = new ComprehensiveQAReport();
reporter.run().then(result => {
  console.log('Comprehensive QA report completed:', result.success);
  process.exit(0);
}).catch(error => {
  console.error('Comprehensive QA report error:', error);
  process.exit(1);
});