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
    // '@snowpack/plugin-typescript',
    ['./snowpack-tagged-scss.js', { compilerOptions: { style: 'compressed' } }],
    '@snowpack/plugin-optimize',
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    treeshake: true,
    rollup: {
      plugins: [
        require('rollup-plugin-license')({
          sourcemap: true,
          thirdParty: {
            output: 'build/.licenses.txt',
          },
        }),
      ],
    },
    /* ... */
  },
  devOptions: {
    /* ... */
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
    /* ... */
  },
  experiments: {
    // TODO try this out instead of plugin
    // optimize: {
    //   entrypoints: ["src/index.ts"],
    //   bundle: true,
    //   minify: true,
    //   target: 'es2020',
    // },
  },
};
