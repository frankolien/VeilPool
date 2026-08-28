import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  /**
   * `@veil/ui` and `@veil/contract-abi` are consumed as TypeScript source rather
   * than pre-built, so the app compiles them itself. That keeps the design system
   * editable without a build-watch loop between packages.
   */
  transpilePackages: ["@veil/ui", "@veil/contract-abi"],
  typescript: { ignoreBuildErrors: false },
  /**
   * Turbopack handles the FHE SDK's WebAssembly module natively; no loader
   * configuration is required. The empty object opts in explicitly so the build
   * does not warn about an absent config.
   */
  turbopack: {},
};

export default config;
