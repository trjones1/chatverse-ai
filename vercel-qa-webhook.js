/**
 * Vercel Deployment Webhook for QA Integration
 * 
 * Add this as a webhook in your Vercel dashboard:
 * Events: deployment.succeeded
 * URL: https://your-webhook-service.com/vercel-qa
 */

const { Octokit } = require('@octokit/rest');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { body } = req;
  
  // Verify this is a successful deployment
  if (body.type !== 'deployment.succeeded') {
    return res.status(200).json({ message: 'Not a successful deployment, ignoring' });
  }

  const { deployment, project, team } = body;
  
  // Only trigger QA for specific projects or environments
  const targetProjects = process.env.QA_TARGET_PROJECTS?.split(',') || ['lexi-bot'];
  
  if (!targetProjects.includes(project.name)) {
    return res.status(200).json({ message: 'Project not in QA target list' });
  }

  try {
    // Initialize GitHub client
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'your-org/lexi-bot').split('/');

    // Determine environment and test scope
    const environment = deployment.meta?.githubDeployment === 'production' ? 'production' : 'preview';
    const testType = environment === 'production' ? 'comprehensive' : 'smoke';

    console.log(`🚀 Triggering QA for ${environment} deployment: ${deployment.url}`);

    // Trigger GitHub Actions workflow
    const workflowDispatch = await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: 'qa-post-deployment.yml',
      ref: 'main', // or deployment.meta?.githubCommitRef
      inputs: {
        environment: environment,
        domains: 'all',
        test_type: testType,
        deployment_url: deployment.url,
        vercel_deployment_id: deployment.uid
      }
    });

    console.log(`✅ QA workflow triggered: ${workflowDispatch.status}`);

    return res.status(200).json({
      success: true,
      message: `QA testing triggered for ${environment} deployment`,
      deployment: {
        id: deployment.uid,
        url: deployment.url,
        environment: environment
      },
      workflow: {
        triggered: true,
        type: testType
      }
    });

  } catch (error) {
    console.error('❌ Failed to trigger QA workflow:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/* 
SETUP INSTRUCTIONS:

1. Deploy this webhook to a serverless function (Vercel, Netlify, etc.)

2. In Vercel Dashboard:
   - Go to Project Settings > Git > Deploy Hooks
   - Add webhook URL: https://your-webhook-service.com/api/vercel-qa
   - Events: deployment.succeeded
   - Enable for production and preview deployments

3. Set environment variables in webhook service:
   - GITHUB_TOKEN: GitHub personal access token with repo and actions permissions
   - GITHUB_REPOSITORY: your-org/lexi-bot
   - QA_TARGET_PROJECTS: lexi-bot,other-project (comma-separated)

4. In GitHub repository secrets, add:
   - Same GITHUB_TOKEN for Actions to trigger workflows
   - Any other QA-specific secrets (email providers, test keys, etc.)

WEBHOOK PAYLOAD EXAMPLE:
{
  "type": "deployment.succeeded",
  "deployment": {
    "uid": "dpl_123",
    "url": "https://lexi-bot-git-main-yourorg.vercel.app",
    "meta": {
      "githubCommitRef": "main",
      "githubDeployment": "production"
    }
  },
  "project": {
    "name": "lexi-bot"
  }
}

This will automatically trigger comprehensive QA testing whenever:
- Production deployment succeeds → Full comprehensive testing
- Preview deployment succeeds → Quick smoke testing
*/