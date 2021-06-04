/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import { promisify } from 'util';
import { exec } from 'child_process';

const asyncExec = promisify( exec );


export default {
	input: [
		'./src/loader.ts',
		'./src/runtime.ts',
	],

	watch: {
		exclude: [
			'./schemas/**',
			'./src/schemas/**',
		],
	},

	output: [
		{
			dir: 'dist/esm',
			format: 'esm',
		},
		{
			dir: 'dist/cjs',
			format: 'cjs',
		},
	],

	external: [
		'../schema/SequenceOptions.json',
		'../schema/SequenceLoaderOptions.json',
	],

	plugins: [
		{
			name: 'SchemaPlugin',
			options: async () => (
				asyncExec( 'npm run update-schema' ).then( () => Promise.resolve( null ) )
			),
			renderChunk: ( code ) => ({
				code: code.replace( /'\.\.\/schema\//g, '\'../../schema/' ),
			}),
		},
		terser({
			format: {
				comments: false,
			},
		}),
		typescript({
			tsconfigOverride: {
				compilerOptions: {
					module: 'esnext',
					resolveJsonModule: false,
				},
				include: [
					'./src/**/*',
				],
				exclude: [
					'./scripts/*',
				],
			},
			clean: true,
		}),
	],
};
