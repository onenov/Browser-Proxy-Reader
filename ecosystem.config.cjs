const path = require("path");
const dotenv = require("dotenv");

const appRoot = __dirname;
const envFile = path.join(appRoot, ".env");
const envConfig = dotenv.config({ path: envFile });
const parsedEnv = envConfig.parsed || {};
const instanceCount = parsedEnv.PM2_INSTANCES || process.env.PM2_INSTANCES || "max";

module.exports = {
  apps: [
    {
      name: "Browser-Reader",
      script: path.join(appRoot, "server.js"),
      cwd: appRoot,
      instances: instanceCount,
      exec_mode: "cluster",
      interpreter: "node",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      env: {
        ...parsedEnv,
        NODE_ENV: "development",
        PORT: parsedEnv.PORT || 3000,
      },
      env_production: {
        ...parsedEnv,
        NODE_ENV: "production",
        PORT: parsedEnv.PORT || 3000,
      },
    },
  ],
};
