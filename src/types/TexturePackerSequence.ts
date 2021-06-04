interface Rect {
	w: number;
	h: number;
}

interface PositionedRect extends Rect {
	x: number;
	y: number;
}

interface TexturePackerFrame {
	frame: PositionedRect;
	rotated: boolean;
	trimmed: boolean;
	spriteSourceSize: PositionedRect;
	sourceSize: Rect;
}

export interface TexturePackerSequence<I = unknown> {
	frames: Record<string, TexturePackerFrame>;
	meta: {
		version: string;
		format: string;
		image: I;
		size: Rect;
		scale: number;
	};
}
