/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@sparticuz/chromium",
      "puppeteer-core",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@sparticuz/chromium": "commonjs @sparticuz/chromium",
        "puppeteer-core": "commonjs puppeteer-core",
      });
    }

    return config;
  },
};

module.exports = nextConfig;
