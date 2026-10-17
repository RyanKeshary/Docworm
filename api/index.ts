// Vercel Serverless Function entry point for Docworm Backend API
import app from '../server/index';

export default function handler(req: any, res: any) {
  // Ensure req.url starts with /api so Express routes match correctly
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : `/${req.url}`);
  }
  return app(req, res);
}
