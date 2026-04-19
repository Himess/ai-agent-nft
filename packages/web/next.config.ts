import type { NextConfig } from "next";
import path from "node:path";

const reactRoot = path.resolve(__dirname, "../../node_modules/react");
const reactDomRoot = path.resolve(__dirname, "../../node_modules/react-dom");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      react: reactRoot,
      "react-dom": reactDomRoot,
    };
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
