import type { NextConfig } from 'next';
const config: NextConfig = { images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.dummyjson.com' }, { protocol: 'https', hostname: 'i.dummyjson.com' }] } };
export default config;
