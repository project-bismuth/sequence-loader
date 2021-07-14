import sharp from 'sharp';
import path from 'path';
import { MaxRectsPacker } from 'maxrects-packer';
import { trackJob } from '@bsmth/loader-progress';
import {
	read as cacheRead,
	write as cacheWrite,
	has as cacheHas,
	invalidateChildren,
} from '@bsmth/loader-cache';

import type { Sequence } from '../types/Sequence';
import type { SequenceOptions } from '../types/Options';
import composite from './composite';
import { omit } from './utils';


interface SequenceFromImgsProps {
	frames: { data: Buffer; path: string }[];
	sequenceHash: string;
	resource: string;
	context: string;
	options: SequenceOptions;
}

export default async function sequenceFromImgs({
	frames: inputFrames,
	sequenceHash,
	resource,
	context,
	options,
}: SequenceFromImgsProps ): Promise<Sequence<string>> {
	// remove options that are not being used here
	// and thus don't influence the outcome
	// 'files' represented by sequenceHash
	const relevantOptions = omit(
		['files', 'format', 'relative', 'imageQuery'],
		options,
	);

	// cache options used for the JSON output
	const cacheOpts = {
		options: relevantOptions,
		resource,
		inputHash: sequenceHash,
		ext: '.json',
	};

	// cache options used for the page image output(s)
	const pageCacheOpts = ( i: number ) => ({
		options: {
			...relevantOptions,
			page: i,
		},
		inputHash: sequenceHash,
		ext: '.png',
		resource,
	});

	// look for cached version of JSON output
	const cached = await cacheRead( cacheOpts );

	if ( cached ) {
		const sequence: Sequence<string> = JSON.parse( cached.buffer.toString( 'utf-8' ) );

		// check if all page images still exist
		// (this also flags them as used)
		const pagesExist = ( await Promise.all(
			sequence.pages.map( ( _, i ) => cacheHas( pageCacheOpts( i ) ) ),
		) ).reduce( ( a, b ) => a && b );

		// if they do, the cached version is valid
		if ( pagesExist ) return sequence;
	}

	// no cached version is available
	// make sure any stale cached files
	// are purged by marking them as invalid
	invalidateChildren( resource );

	// start spinner
	const completeJob = trackJob({
		text: 'building sequence',
		reportName: resource,
	});


	const packer = new MaxRectsPacker(
		options.pageMaxWidth,
		options.pageMaxHeight,
		options.padding,
	);


	let allFramesOpaque = true;
	let sequenceWidth: number;
	let sequenceHeight: number;

	await Promise.all( inputFrames.map( async ({
		data: frameData,
		path: framePath,
	}, i ) => {
		const img = sharp( frameData );
		const { isOpaque } = await img.stats();
		const {
			width: originalWidth,
			height: originalHeight,
		} = await img.metadata();

		const fullWidth = Math.round( originalWidth * options.scale );
		const fullHeight = Math.round( originalHeight * options.scale );

		if ( !sequenceHeight && !sequenceWidth ) {
			// store dimensions of first frame
			sequenceWidth = fullWidth;
			sequenceHeight = fullHeight;
		} else if (
			sequenceWidth !== fullWidth
			|| sequenceHeight !== fullHeight
		) {
			throw new Error(
				`[@bsmth/sequence-loader]: the resolution of frame '${
					path.basename( framePath )
				}' does not match that of the sequence (expected ${
					sequenceWidth},${sequenceHeight
				}, saw ${fullWidth},${fullHeight})`,
			);
		}

		// track wether an alpha channel is needed
		if ( !isOpaque ) allFramesOpaque = false;

		// scale the image
		// a new instance of sharp is needed here, since resize()
		// and trim() ignore the order and produce some rather funky results.
		// Writing to an intermediate buffer circumvents this.
		const scaled = sharp( await img.resize( fullWidth, fullHeight ).toBuffer() );

		if ( options.trim ) {
			scaled.trim( options.trimThreshold );
		}

		// store the result in another buffer
		// and gather some trimming info
		const {
			data,
			info: {
				width: trimmedWidth,
				height: trimmedHeight,
				trimOffsetLeft,
				trimOffsetTop,
			},
		} = await scaled.toBuffer({ resolveWithObject: true });


		// add a rect representing the frame to the packer
		// along with some data for later use
		packer.add(
			trimmedWidth,
			trimmedHeight,
			{
				frame: i,
				buffer: data,
				padding: {
					top: -trimOffsetTop,
					left: -trimOffsetLeft,
					bottom: fullHeight - trimmedHeight + trimOffsetTop,
					right: fullWidth - trimmedWidth + trimOffsetLeft,
				},
			},
		);
	}) );


	// create a layout from the the frames list
	// passing 'false' causes the packer to repack all bins
	packer.repack( false );


	const frames: Sequence<string>['frames'] = [];
	const pages: Sequence<string>['pages'] = [];

	// packer.bins represent our page images
	// create the actual image file for each one
	await Promise.all( packer.bins.map( async ( bin, pageIndex ) => {
		// create a new base image
		const img = sharp({
			create: {
				width: bin.width,
				height: bin.height,
				// omit the alpha channel if all
				// frames are opaque anyways
				channels: allFramesOpaque ? 3 : 4,
				background: allFramesOpaque ? {
					r: 0, g: 0, b: 0,
				} : {
					r: 0, g: 0, b: 0, alpha: 0,
				},
			},
		});

		// this is a list of instructions on
		// where our frames should be placed on the page
		const subFrames: sharp.OverlayOptions[] = [];

		// bin.rects represents the frames included
		// on the current page
		bin.rects.forEach( rect => {
			// add the frame meta to our frames array
			frames.push({
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				padding: rect.data.padding,
				page: pageIndex,
				frame: rect.data.frame,
			});

			// and add the painting instructions
			subFrames.push({
				input: rect.data.buffer,
				left: rect.x,
				top: rect.y,
			});
		});

		// write the resulting file to cache,
		// this returns its absolute path
		const pageFilePath = await cacheWrite({
			// paint the frames on top of our base image
			buffer: await composite({
				initial: img,
				jobs: subFrames,
			}),
			...pageCacheOpts( pageIndex ),
		});

		// add the page meta to our pages list
		// while preserving the index
		pages[pageIndex] = ({
			width: bin.width,
			height: bin.height,
			// since our results will be cached (and may be reused on a different machine),
			// we'll need to use a relative path here
			img: path.relative( context, pageFilePath ),
		});
	}) );


	// construct the actual Sequence
	const sequence: Sequence<string> = {
		pages,
		frames,
		width: sequenceWidth,
		height: sequenceHeight,
	};

	// and write it to the cache
	await cacheWrite({
		buffer: Buffer.from( JSON.stringify( sequence ), 'utf-8' ),
		...cacheOpts,
	});

	// stop spinner
	completeJob();


	return sequence;
}
