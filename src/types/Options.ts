/* eslint-disable max-len */
export interface InternalSequenceOptions {
	/**
	 * A glob pattern pointing to your sequence frames.
	 * This is relative to the .json you're importing.
	 *
	 * @default "./*.{png,jpg}"
	 * @see https://github.com/isaacs/node-glob#glob-primer
	 * */
	files: string;
	/**
	 * A scalar applied to your frames before being packed.
	 * Useful if the frames are at a higher resolution than the final animation.
	 *
	 * @default 1
	 * */
	scale: number;
	/**
	 * Amout of pixels in between the packed frames.
	 * Useful if you see bleeding at the frame edges.
	 *
	 * @default 0
	 * */
	padding: number;
	/**
	 * Whether to trim 'uninteresting' pixels off the frame edges.
	 * This reduces file size, but you'll need to reconstruct the trimmed areas manually.
	 *
	 * @default true
	 * */
	trim: boolean;
	/**
	 * The threshold below which a pixel will be considered 'uninteresting'.
	 * This represents the maximum difference from the top-left pixel of the image.
	 *
	 * @default 1
	 * */
	trimThreshold: number;
	/**
	 * Whether to output coordinates relative to the page instead of pixel coordinates.
	 * Useful if the output image is being resized.
	 *
	 * @default false
	 * */
	relative: boolean;
	/**
	 * Maximum width in pixels a page image may be.
	 * Note that multiple pages may be created to fit all frames.
	 *
	 * @default 4096
	 * */
	pageMaxWidth: number;
	/**
	 * Maximum height in pixels a page image may be.
	 * Note that multiple pages may be created to fit all frames.
	 *
	 * @default 4096
	 * */
	pageMaxHeight: number;
	/**
	 * The format in which you'll receive the sequence.
	 * Choosing 'TexturePacker' gives you an array of objects that match the output of running `TexturePacker` with `--format json`
	 *
	 * @default "default"
	 * */
	format: 'default' | 'TexturePacker';
	/**
	 * Query string appended to the generated image imports.
	 * Useful if you want to pass info to your image loader.
	 *
	 * @default ""
	 * */
	imageQuery: string;
}

export interface SequenceLoaderOptions extends Partial<Omit<InternalSequenceOptions, 'files'>> {
	/**
	 * Whether to output a .d.ts files next to an imported JSON.
	 * This provides correct types based on your settings.
	 *
	 * @default false
	 * */
	generateDeclarations?: boolean;
	/**
	 * What module format the JS output should be generated in.
	 *
	 * @default 'esm'
	 * */
	output?: 'commonjs' | 'esm';
}

export interface SequenceOptions extends Partial<InternalSequenceOptions> {
	// remove error when using a schema to get validation/autocompletion
	'$schema'?: string;
}
