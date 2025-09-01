/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Only apply this rule for the server-side build
    if (isServer) {
      // Add better-sqlite3 to the list of externals
      // This tells webpack not to bundle it
      config.externals.push('better-sqlite3');
    }

    // Important: return the modified config
    return config;
  },
};

module.exports = nextConfig;
