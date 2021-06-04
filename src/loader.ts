import path from 'path';
import glob from 'glob-promise';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import loaderUtils from 'loader-utils';
import { validate } from 'schema-utils';
import { ensureCacheReady } from '@bsmth/loader-cache';

import type {
	InternalSequenceOptions,
	SequenceLoaderOptions,
	SequenceOptions,
} from './types/Options';

import { pack } from './lib/packing';
import { omit, xorInplace } from './lib/utils';
import sequenceFromImgs from './lib/sequenceFromImgs';
import generateDeclaration from './lib/generateDeclaration';

import sequenceSchema from '../schema/SequenceOptions.json';
import optionsSchema from '../schema/SequenceLoaderOptions.json';


export default async function load( source: string ): Promise<string> {
	// options from loader config
	const globalOptions: SequenceLoaderOptions = loaderUtils.getOptions( this ) || {};
	// options from imported JSON file
	const localOptions: SequenceOptions = JSON.parse( source );

	validate( optionsSchema as unknown, globalOptions, {
		name: '@bsmth/sequence-loader',
		baseDataPath: 'options',
	});

	validate( sequenceSchema as unknown, localOptions, {
		name: '@bsmth/sequence-loader',
		baseDataPath: 'sequence.json',
	});


	// merge options with defaults
	const options: InternalSequenceOptions = {
		files: './*.{png,jpg}',
		scale: 1,
		padding: 0,
		trim: true,
		trimThreshold: 1,
		relative: false,
		pageMaxWidth: 4096,
		pageMaxHeight: 4096,
		format: 'default',
		imageQuery: '',
		// omit options not configurable locally
		...omit(['generateDeclarations', 'output'], globalOptions ),
		// omit options that are irrelevant but valid
		...omit(['$schema'], localOptions ),
	};

	const useEsm = globalOptions.output.toLowerCase() !== 'commonjs';

	const {
		resource,
		context,
		resourcePath,
		addContextDependency,
	} = this;


	// get a list of all frames
	const frameFiles = await glob(
		options.files,
		{
			// relative to the imported JSON file
			cwd: context,
			// but outputting absolute paths
			absolute: true,
		},
	);


	// flag all immediate parent directories of the frames
	// as context dependencies.
	// This is an imperfect way of listening for changes in
	// the frame sequence. (Adding a frame will trigger a rebuild)
	const dependencyRoots = new Set();

	frameFiles.forEach( frame => dependencyRoots.add( path.dirname( frame ) ) );
	dependencyRoots.forEach( root => addContextDependency( root ) );


	// read all frame files and represent
	// the entire sequence as a hash
	let sequenceHash: Buffer;

	const frames = await Promise.all( frameFiles.map( async ( frame ) => {
		const data = await fs.readFile( frame );
		const hasher = createHash( 'md4' );

		hasher.update( data );

		if ( sequenceHash ) {
			// XORing all hashes together ensures that we'll get
			// the same hash regardless of order.
			// (which is important since the files are not read sequentially)
			// This will, however, give a false positive if the frame order changes due to renaming.
			xorInplace( sequenceHash, hasher.digest() );
		} else {
			sequenceHash = hasher.digest();
		}

		return {
			data,
			path: frame,
		};
	}) );


	await ensureCacheReady();

	// build the sequence or read it from cache
	const sequence = await sequenceFromImgs({
		frames,
		options,
		resource,
		context,
		sequenceHash: sequenceHash.toString( 'hex' ),
	});


	if ( globalOptions.generateDeclarations ) {
		// emit a .d.ts file next to the imported JSON
		await generateDeclaration({
			path: resourcePath,
			format: options.format,
			query: options.imageQuery,
		});
	}


	const output: string[] = [];


	// import a runtime that unpacks to the desired format
	const runtime = options.format === 'TexturePacker'
		? 'unpackTexturePacker'
		: 'unpack';

	output.push(
		useEsm
			? `import { ${runtime} as unpack } from '@bsmth/sequence-loader/dist/esm/runtime.js';`
			: `const unpack = require('@bsmth/sequence-loader/dist/cjs/runtime.js').${runtime};`,
	);


	// pack the generated sequence into a string
	let packed = JSON.stringify( pack( sequence ) );

	sequence.pages.forEach( ( page, i ) => {
		// import each page image into a variable
		const pagePath = `${page.img}${options.imageQuery}`;
		output.push(
			useEsm
				? `import page${i} from '${pagePath}';`
				: `const page${i} = require('${pagePath}');`,
		);

		// and replace the reference in
		// the packed sequence with that variable
		packed = packed.replace( `"${page.img}"`, `page${i}` );
	});

	// add a new line for good mesure
	output.push( '' );

	// export the sequence
	output.push(
		// pass things to our runtime
		useEsm
			? 'export default unpack('
			: 'module.exports = unpack(',

		// the first argument is our packed sequence
		`\t${packed},`,

		// the second whether relative coords should be used
		`\t${options.relative.toString()},`,

		');',
	);


	return output.join( '\n' );
}
