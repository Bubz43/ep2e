const autoPreprocess = require("svelte-preprocess");
module.exports = {
	preprocess: autoPreprocess({
		scss: true,
		defaults: {
			script: "typescript",
		},
	}),
};