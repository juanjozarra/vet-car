import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.join(process.cwd(), "styles")],
    additionalData: `@import "tokens"; @import "mixins";`,
  },
};

export default nextConfig;
