const path = require('path');

module.exports = {
  plugins: {
    'postcss-import': {
      path: [path.resolve(process.cwd())],
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};
