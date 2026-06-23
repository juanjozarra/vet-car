import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const stylesDir = path.join(process.cwd(), "styles");
const tokens = fs.readFileSync(path.join(stylesDir, "_tokens.scss"), "utf8");
const mixins = fs.readFileSync(path.join(stylesDir, "_mixins.scss"), "utf8");

const nextConfig: NextConfig = {
  sassOptions: {
    additionalData: `${tokens}\n${mixins}`,
  },
};

export default nextConfig;
