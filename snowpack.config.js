module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-babel', // TODO Check if I actually need babel
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
          watch: 'build/_dist_',
        }),
      ],
    },
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    /* ... */
  },
  alias: {
    /* ... */
  },
};
