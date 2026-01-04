import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Static export: this app is client-only and should deploy as static files (e.g. Pages/Netlify).
    output: 'export'
};

export default nextConfig;
