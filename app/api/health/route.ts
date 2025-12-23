import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Health check endpoint for monitoring and uptime
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    version: '1.0.0'
  };

  // Check Supabase connection
  const supabaseStartTime = Date.now();
  try {
    const admin = getSupabaseAdmin();
    // Simple table query that should work - use a table we know exists
    const { data, error } = await admin.from('memories').select('*').limit(1);
    
    checks.supabase = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Connected',
      responseTime: Date.now() - supabaseStartTime
    };
  } catch (error) {
    checks.supabase = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - supabaseStartTime
    };
  }


  // Check OpenRouter API
  const openrouterStartTime = Date.now();
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      checks.openrouter = {
        status: 'error',
        message: 'OPENROUTER_API_KEY not configured'
      };
    } else {
      // Simple OpenRouter API test - check models endpoint
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      });
      
      checks.openrouter = {
        status: response.ok ? 'ok' : 'error',
        message: response.ok ? 'Connected' : `HTTP ${response.status}`,
        responseTime: Date.now() - openrouterStartTime
      };
    }
  } catch (error) {
    checks.openrouter = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - openrouterStartTime
    };
  }


  // Check ElevenLabs API (for voice features)
  if (process.env.ELEVENLABS_API_KEY) {
    const elevenStartTime = Date.now();
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      });
      
      checks.elevenlabs = {
        status: response.ok ? 'ok' : 'error',
        message: response.ok ? 'Connected' : `HTTP ${response.status}`,
        responseTime: Date.now() - elevenStartTime
      };
    } catch (error) {
      checks.elevenlabs = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
        responseTime: Date.now() - elevenStartTime
      };
    }
  } else {
    checks.elevenlabs = {
      status: 'not_configured',
      message: 'ElevenLabs API key not configured'
    };
  }

  // Overall health status
  const criticalServices = ['supabase', 'openrouter'];
  const criticalErrors = criticalServices.filter(service => checks[service]?.status === 'error');
  
  const overallStatus = criticalErrors.length === 0 ? 'healthy' : 'unhealthy';
  const totalResponseTime = Date.now() - startTime;

  const healthReport = {
    status: overallStatus,
    timestamp: checks.timestamp,
    environment: checks.environment,
    version: checks.version,
    totalResponseTime,
    services: checks,
    criticalErrors: criticalErrors.length > 0 ? criticalErrors : undefined
  };

  // Return appropriate status code
  const httpStatus = overallStatus === 'healthy' ? 200 : 503;
  
  return NextResponse.json(healthReport, { 
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}