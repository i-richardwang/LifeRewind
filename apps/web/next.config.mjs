/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  serverExternalPackages: [
    "ews-javascript-api",
    "@ewsjs/xhr",
    "deasync",
    "http-cookie-agent",
  ],
}

export default nextConfig
