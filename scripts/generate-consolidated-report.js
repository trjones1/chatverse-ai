#!/usr/bin/env node

/**
 * Consolidated Report Generator
 * Creates beautiful HTML and JSON reports from all test artifacts
 * Displays perfectly in GitHub Actions and web browsers
 */

const fs = require('fs');
const path = require('path');

class ConsolidatedReportGenerator {
  constructor() {
    this.allResults = {
      smokeTests: [],
      comprehensiveTests: [],
      screenshots: [],
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.ENVIRONMENT || 'unknown',
        deploymentUrl: process.env.DEPLOYMENT_URL || 'unknown',
        githubSha: process.env.GITHUB_SHA || 'unknown',
        githubRunId: process.env.GITHUB_RUN_ID || 'unknown'
      }
    };
  }

  async generate() {
    console.log('📋 Generating Consolidated QA Report...');
    
    await this.collectTestResults();
    await this.collectScreenshots();
    const summary = await this.generateSummary();
    
    await this.generateJSONReport(summary);
    await this.generateHTMLReport(summary);
    
    console.log('✅ Consolidated report generation complete!');
  }

  async collectTestResults() {
    const testResultsDir = 'test-results';
    
    if (!fs.existsSync(testResultsDir)) {
      console.log('⚠️  No test results directory found');
      return;
    }

    console.log('📊 Collecting test results...');
    
    const artifacts = fs.readdirSync(testResultsDir);
    
    for (const artifactDir of artifacts) {
      const artifactPath = path.join(testResultsDir, artifactDir);
      
      if (fs.statSync(artifactPath).isDirectory()) {
        const files = fs.readdirSync(artifactPath);
        
        for (const file of files) {
          const filePath = path.join(artifactPath, file);
          
          if (file.endsWith('.json')) {
            try {
              const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              
              if (file.startsWith('smoke-test-')) {
                this.allResults.smokeTests.push(content);
                console.log(`   📄 Collected smoke test: ${file}`);
              } else if (file.startsWith('qa-report-')) {
                this.allResults.comprehensiveTests.push(content);
                console.log(`   📄 Collected QA report: ${file}`);
              }
            } catch (error) {
              console.error(`   ❌ Failed to parse ${file}: ${error.message}`);
            }
          }
        }
      }
    }
  }

  async collectScreenshots() {
    console.log('📸 Collecting screenshots...');
    
    const screenshotDirs = ['screenshots', 'test-results'];
    
    for (const dir of screenshotDirs) {
      if (fs.existsSync(dir)) {
        this.findScreenshots(dir);
      }
    }
    
    console.log(`   Found ${this.allResults.screenshots.length} screenshots`);
  }

  findScreenshots(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.findScreenshots(itemPath);
      } else if (item.endsWith('.png') || item.endsWith('.jpg')) {
        this.allResults.screenshots.push({
          path: itemPath,
          name: item,
          size: stat.size,
          domain: this.extractDomainFromFilename(item)
        });
      }
    }
  }

  extractDomainFromFilename(filename) {
    const parts = filename.split('-');
    const domains = [
      'chatwithlexi.com', 'fuckboychase.com', 'talktonyx.com',
      'sirdominic.com', 'chatwithethan.com', 'chatwithjayden.com',
      'chatwithmiles.com', 'chatwithchloe.com', 'waifuwithaiko.com',
      'chatwithzaria.com', 'chatwithnova.com'
    ];
    
    for (const domain of domains) {
      if (filename.includes(domain.split('.')[0])) {
        return domain;
      }
    }
    
    return 'unknown';
  }

  async generateSummary() {
    console.log('📈 Generating summary statistics...');
    
    const summary = {
      totalDomains: 0,
      successful: 0,
      failed: 0,
      successRate: '0%',
      totalDuration: '0s',
      totalTests: 0,
      environments: new Set(),
      domains: []
    };

    // Process smoke tests
    for (const smokeTest of this.allResults.smokeTests) {
      summary.totalDomains++;
      summary.totalTests += smokeTest.tests?.length || 0;
      
      if (smokeTest.success) {
        summary.successful++;
      } else {
        summary.failed++;
      }
      
      if (smokeTest.environment) {
        summary.environments.add(smokeTest.environment);
      }

      summary.domains.push({
        name: smokeTest.domain,
        type: 'smoke',
        success: smokeTest.success,
        duration: `${((smokeTest.duration || 0) / 1000).toFixed(1)}s`,
        tests: smokeTest.tests?.length || 0,
        errors: smokeTest.errors || []
      });
    }

    // Process comprehensive tests
    for (const compTest of this.allResults.comprehensiveTests) {
      if (compTest.domains) {
        for (const domain of compTest.domains) {
          summary.totalDomains++;
          summary.totalTests += domain.tests?.length || 0;
          
          if (domain.success) {
            summary.successful++;
          } else {
            summary.failed++;
          }

          summary.domains.push({
            name: domain.domain,
            type: 'comprehensive',
            success: domain.success,
            duration: `${((domain.duration || 0) / 1000).toFixed(1)}s`,
            tests: domain.tests?.length || 0,
            errors: domain.errors || []
          });
        }
      }
    }

    // Calculate final metrics
    if (summary.totalDomains > 0) {
      summary.successRate = `${((summary.successful / summary.totalDomains) * 100).toFixed(1)}%`;
    }

    // Group by domain name for deduplication
    const domainMap = new Map();
    for (const domain of summary.domains) {
      if (!domainMap.has(domain.name) || domain.type === 'comprehensive') {
        domainMap.set(domain.name, domain);
      }
    }
    summary.domains = Array.from(domainMap.values());
    summary.totalDomains = summary.domains.length;
    
    // Recalculate success/fail counts
    summary.successful = summary.domains.filter(d => d.success).length;
    summary.failed = summary.domains.filter(d => !d.success).length;
    summary.successRate = `${((summary.successful / summary.totalDomains) * 100).toFixed(1)}%`;

    return summary;
  }

  async generateJSONReport(summary) {
    const jsonReport = {
      summary,
      metadata: this.allResults.metadata,
      smokeTests: this.allResults.smokeTests,
      comprehensiveTests: this.allResults.comprehensiveTests,
      screenshots: this.allResults.screenshots.map(s => ({
        name: s.name,
        domain: s.domain,
        size: `${(s.size / 1024).toFixed(1)}KB`
      }))
    };

    fs.writeFileSync('consolidated-report.json', JSON.stringify(jsonReport, null, 2));
    console.log('📄 JSON report saved: consolidated-report.json');
  }

  async generateHTMLReport(summary) {
    const html = this.generateHTMLTemplate(summary);
    fs.writeFileSync('consolidated-report.html', html);
    console.log('🌐 HTML report saved: consolidated-report.html');
  }

  generateHTMLTemplate(summary) {
    const successColor = '#10b981';
    const failColor = '#ef4444';
    const warningColor = '#f59e0b';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QA Test Report - ${this.allResults.metadata.environment}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header .subtitle {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .metadata {
            background: #f1f5f9;
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .metadata-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .metadata-item strong {
            color: #1e293b;
        }
        .summary {
            padding: 30px;
        }
        .summary h2 {
            margin: 0 0 25px 0;
            color: #1e293b;
            font-size: 1.8rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            text-align: center;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #64748b;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .success { color: ${successColor}; }
        .failed { color: ${failColor}; }
        .warning { color: ${warningColor}; }
        .domains {
            padding: 0 30px 30px;
        }
        .domains h2 {
            color: #1e293b;
            margin-bottom: 25px;
            font-size: 1.8rem;
        }
        .domain-grid {
            display: grid;
            gap: 15px;
        }
        .domain-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s ease;
        }
        .domain-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .domain-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 15px;
        }
        .domain-name {
            font-size: 1.3rem;
            font-weight: 600;
            color: #1e293b;
        }
        .domain-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-success {
            background: #dcfce7;
            color: #166534;
        }
        .status-failed {
            background: #fef2f2;
            color: #991b1b;
        }
        .domain-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .detail-item {
            text-align: center;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
        }
        .detail-value {
            font-weight: 600;
            color: #1e293b;
        }
        .detail-label {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 2px;
        }
        .errors {
            margin-top: 15px;
            padding: 15px;
            background: #fef2f2;
            border-radius: 6px;
            border-left: 4px solid #ef4444;
        }
        .errors h4 {
            margin: 0 0 10px 0;
            color: #991b1b;
        }
        .error-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .error-list li {
            padding: 5px 0;
            color: #7f1d1d;
            font-size: 0.9rem;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px 30px;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2rem; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .domain-details { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 QA Test Report</h1>
            <div class="subtitle">Automated Testing Results for ${this.allResults.metadata.environment.toUpperCase()} Environment</div>
        </div>

        <div class="metadata">
            <div class="metadata-grid">
                <div class="metadata-item">
                    <strong>Environment:</strong> ${this.allResults.metadata.environment}
                </div>
                <div class="metadata-item">
                    <strong>Deployment:</strong> ${this.allResults.metadata.deploymentUrl}
                </div>
                <div class="metadata-item">
                    <strong>GitHub SHA:</strong> ${this.allResults.metadata.githubSha.substring(0, 8)}
                </div>
                <div class="metadata-item">
                    <strong>Timestamp:</strong> ${new Date(this.allResults.metadata.timestamp).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="summary">
            <h2>📊 Test Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${summary.totalDomains}</div>
                    <div class="stat-label">Total Domains</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number success">${summary.successful}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number failed">${summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number ${parseFloat(summary.successRate) === 100 ? 'success' : parseFloat(summary.successRate) >= 80 ? 'warning' : 'failed'}">${summary.successRate}</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
        </div>

        <div class="domains">
            <h2>🎭 Domain Results</h2>
            <div class="domain-grid">
                ${summary.domains.map(domain => `
                    <div class="domain-card">
                        <div class="domain-header">
                            <div class="domain-name">${domain.name}</div>
                            <div class="domain-status ${domain.success ? 'status-success' : 'status-failed'}">
                                ${domain.success ? '✅ PASSED' : '❌ FAILED'}
                            </div>
                        </div>
                        <div class="domain-details">
                            <div class="detail-item">
                                <div class="detail-value">${domain.type}</div>
                                <div class="detail-label">Test Type</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-value">${domain.duration}</div>
                                <div class="detail-label">Duration</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-value">${domain.tests}</div>
                                <div class="detail-label">Tests Run</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-value">${domain.errors.length}</div>
                                <div class="detail-label">Errors</div>
                            </div>
                        </div>
                        ${domain.errors.length > 0 ? `
                            <div class="errors">
                                <h4>❌ Errors:</h4>
                                <ul class="error-list">
                                    ${domain.errors.map(error => `<li>${error}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            🤖 Generated by Automated QA System • GitHub Run ID: ${this.allResults.metadata.githubRunId}
        </div>
    </div>
</body>
</html>`;
  }
}

// CLI execution
async function main() {
  const generator = new ConsolidatedReportGenerator();
  
  try {
    await generator.generate();
    process.exit(0);
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ConsolidatedReportGenerator };