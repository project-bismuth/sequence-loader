import type { PackedSequence, PackedFrame, Sequence } from '../types/Sequence';
import type { TexturePackerSequence } from '../types/TexturePackerSequence';


export function packFrames( frames: Sequence['frames']): PackedFrame[] {
	// make sure the frames are in the correct order,
	// since we'll be storing that info as the index
	return frames.sort( ( a, b ) => a.frame - b.frame ).map( ({
		x, y, page, width, height, padding,
	}) => {
		if (
			padding.top === 0
			&& padding.bottom === 0
			&& padding.left === 0
			&& padding.right === 0
		) {
			return [x, y, page];
		}
		return [
			x, y, page, width, height, padding.left, padding.top,
		];
	});
}


export function pack( sequence: Sequence ): PackedSequence {
	return [
		sequence.width,
		sequence.height,
		packFrames( sequence.frames ),
		sequence.pages.map( ({ width, height, img }) => [
			width, height, img,
		]),
	];
}


export function unpack( sequence: PackedSequence, relative = false ): Sequence {
	const [sequenceWidth, sequenceHeight, frames, pages] = sequence;

	return {
		width: sequenceWidth,

		height: sequenceHeight,

		pages: pages.map( ([
			width, height, img,
		]) => ({
			width, height, img,
		}) ),

		frames: frames.map( (
			[x, y, page, ...data],
			frame,
		) => {
			const isUntrimmed = data.length === 0;
			const width = isUntrimmed ? sequenceWidth : data[0];
			const height = isUntrimmed ? sequenceHeight : data[1];
			const left = isUntrimmed ? 0 : data[2];
			const top = isUntrimmed ? 0 : data[3];

			if ( !relative ) {
				return {
					frame,
					page,
					x,
					y,
					width,
					height,
					padding: {
						top,
						left,
						right: sequenceWidth - left - width,
						bottom: sequenceHeight - top - height,
					},
				};
			}

			const [pageWidth, pageHeight] = pages[page];
			return {
				frame,
				page,
				x: x / pageWidth,
				y: y / pageHeight,
				width: width / pageWidth,
				height: height / pageHeight,
				padding: {
					top: top / pageHeight,
					left: left / pageWidth,
					right: ( sequenceWidth - left - width ) / pageWidth,
					bottom: ( sequenceHeight - top - height ) / pageHeight,
				},
			};
		}),
	};
}


export function unpackTexturePacker(
	sequence: PackedSequence,
	relative = false,
): TexturePackerSequence[] {
	const unpacked = unpack( sequence, relative );
	const pad = '0'.repeat( unpacked.frames.length.toString().length );

	const pages: TexturePackerSequence[] = unpacked.pages.map( ( page ) => ({
		frames: {},
		meta: {
			version: '1.0',
			format: 'RGBA8888',
			scale: 1,
			image: page.img,
			size: {
				w: page.width,
				h: page.height,
			},
		},
	}) );

	unpacked.frames.forEach( ({
		width, height, x, y, frame, page,
		padding: {
			top, right, bottom, left,
		},
	}) => {
		// pad the frame id with leading zeroes
		// so that sorting alphabetically works
		pages[page].frames[`frame-${( pad + frame ).slice( -pad.length )}`] = {
			rotated: false,
			trimmed: Math.max( top, right, bottom, left ) > 0,
			frame: {
				x,
				y,
				w: width,
				h: height,
			},
			spriteSourceSize: {
				x: left,
				y: top,
				w: width,
				h: height,
			},
			sourceSize: {
				w: width + left + right,
				h: height + top + bottom,
			},
		};
	});

	return pages;
}
