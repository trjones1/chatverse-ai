// pages/api/debug-analytics.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const debug: any = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID || 'Not set',
    },
    headers: {
      host: req.headers.host,
      userAgent: req.headers['user-agent']?.slice(0, 100) + '...',
      referer: req.headers.referer,
    },
    timestamp: new Date().toISOString(),
  };

  // Test character config loading
  try {
    const { getCharacterConfig } = require('../../lib/characters.config');
    const hostname = req.headers.host || 'localhost:3000';
    const config = getCharacterConfig(hostname);

    debug.character = {
      key: config.key,
      displayName: config.displayName,
      gtmId: config.gtm || 'Not set',
      domain: hostname,
    };
  } catch (error: any) {
    debug.characterError = error.message;
  }

  res.status(200).json(debug);
}