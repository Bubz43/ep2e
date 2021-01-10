/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: [
    '@snowpack/plugin-svelte',
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-typescript',
    './snowpack-tagged-scss.js',

  ],
  install: [
    /* ... */
  ],
  installOptions: {
    rollup: {
      plugins: [
        require('rollup-plugin-livereload')({
          watch: 'build/dist',
        }),
      ],
    },
    /* ... */
  },
  devOptions: {
    // hmr: true,
  },
  buildOptions: {
    clean: true,
    /* ... */
  },
  proxy: {
    /* ... */
  },
  alias: {
    '@src': './src',
  },

};
