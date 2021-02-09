const scssPlugin = require('@snowpack/plugin-sass');

function stripFileExtension(filename) {
  return filename.split('.').slice(0, -1).join('.');
}

module.exports = function sassPlugin(_, { native, compilerOptions = {} } = {}) {
  const basePlugin = scssPlugin(_, { native, compilerOptions });

  /** @type {import("snowpack").SnowpackPlugin } */
  const plugin = {
    ...basePlugin,
    name: 'snowpack-tagged-scss',
    resolve: {
      input: ['.scss', '.sass'],
      output: ['.css.js', '.css'],
    },
    async load({ filePath, isDev }) {
      const index = filePath.indexOf('src');
      const afterSrc = [...filePath.slice(index)].reduce(
        (accum, char) =>
          char === '\\' || char === '/' ? [...accum, '..'] : accum,
        [],
      );
      const stdout = await basePlugin.load({ filePath, isDev });

      if (stripFileExtension(filePath).endsWith('global')) {
        return { '.css': stdout };
      }

      return {
        '.css.js': `import {css} from '${afterSrc.join(
          '/',
        )}/_snowpack/pkg/lit-element.js';
  
        const style = css\`${stdout}\`; 
        export default style`,
      };
    },
  };
  return plugin;
};
