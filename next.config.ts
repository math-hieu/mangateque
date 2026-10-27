import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "s4.anilist.co" }],
  },
  // Les recommandations sont lues depuis le disque au runtime : sans ça, les
  // JSON ne sont pas embarqués dans la fonction Vercel.
  outputFileTracingIncludes: {
    "/recommandations": ["./data/recommandations/**/*.json"],
  },
};

export default nextConfig;
