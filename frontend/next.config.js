const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Clean trailing slashes and redundant /api suffix so destination is always cleanly ${cleanUrl}/api/:path*
const cleanUrl = rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");

const nextConfig = {
  // Proxy /api requests to the FastAPI backend (works for both local dev and Vercel edge proxy)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${cleanUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
