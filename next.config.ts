import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Headers de segurança (anti-clickjacking / sniffing / HTTPS forçado).
  // CSP fica de fora por ora — exige ajuste fino p/ não quebrar Next/Supabase.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
