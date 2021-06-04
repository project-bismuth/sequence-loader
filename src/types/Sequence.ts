interface Frame {
	x: number;
	y: number;
	width: number;
	height: number;
	page: number;
	frame: number;
	padding: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
}

export type PackedFrame = [
	x: number,
	y: number,
	width: number,
	height: number,
	paddingLeft: number,
	paddingTop: number,
	page: number,
];


interface Page<I = unknown> {
	width: number;
	height: number;
	img: I;
}

type PackedPage<I = unknown> = [
	width: number,
	height: number,
	img: I,
];


export interface Sequence<I = unknown> {
	frames: Frame[];
	pages: Page<I>[];
	width: number;
	height: number;
}

export type PackedSequence<I = unknown> = [
	width: number,
	height: number,
	frames: PackedFrame[],
	pages: PackedPage<I>[],
];
