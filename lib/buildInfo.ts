// lib/buildInfo.ts
export const BUILD_INFO = {
  timestamp: new Date().toISOString(),
  hash: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 
        process.env.GITHUB_SHA?.slice(0, 7) || 
        Math.random().toString(36).substring(2, 9),
  version: process.env.npm_package_version || '1.0.0',
  buildNumber: Date.now().toString(36),
};

export function getBuildDisplay() {
  return `v${BUILD_INFO.version}-${BUILD_INFO.hash} (${BUILD_INFO.buildNumber})`;
}