import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/index.js',
	plugins: [
		buble({
			include: [ 'src/index.js' ],
			target: {
				node: '0.12'
			}
		}),
		commonjs(),
		nodeResolve({
			jsnext: true
		})
	],
	external: [
		'fs',
		'path',
		'hasha'
	],
	targets: [
		{ dest: 'dist/rollup-plugin-hash.js', format: 'cjs' },
		{ dest: 'dist/rollup-plugin-hash.es.js', format: 'es' }
	]
};
