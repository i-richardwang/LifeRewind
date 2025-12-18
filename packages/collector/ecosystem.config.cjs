/* eslint-env node */
module.exports = {
  apps: [
    {
      name: 'liferewind-collector',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
        COLLECTOR_RUN_ON_START: 'true',
      },
      error_file: '~/.pm2/logs/liferewind-collector-error.log',
      out_file: '~/.pm2/logs/liferewind-collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exp_backoff_restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
