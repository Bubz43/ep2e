/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: '/dist' },
  },
  plugins: [
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-typescript',
    './snowpack-tagged-scss.js',
  ],
  packageOptions: {
    rollup: {
      plugins: [
        require('rollup-plugin-livereload')({
          watch: 'build/dist',
        }),
      ],
    },
  },
  devOptions: {
    // TODO come back to this later
    // hmr: true,
  },
  buildOptions: {
    clean: true,
    // sourcemap: true,
    watch: true,
  },
  alias: {
    '@src': './src',
  },
};
