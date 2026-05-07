module.exports = {
  apps: [{
    name: 'aivorasystem',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/aivorasystem',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
