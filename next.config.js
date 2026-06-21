/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@sparticuz/chromium",
      "puppeteer-core",
    ],
    outputFileTracingIncludes: {
      "/api/records/receipts/[record_r_number]/download": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
        "./node_modules/@sparticuz/chromium/build/**/*",
      ],
    },
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
