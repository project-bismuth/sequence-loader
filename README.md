# 📽🗺 bismuth sequence loader

> Streamlined sprite animation packing for webpack.

## Motivations

Implementing sprite based animations usually requires the use of a locally installed tool like [`TexturePacker`](https://www.codeandweb.com/texturepacker), necessitating additional setup steps, making things inconvenient to upgrade and cumbersome to integrate with an existing webpack setup. `@bsmth/sequence-loader` attempts to solve this by fully integrating the packing step with webpack, passing the atlas images off to your existing image loader.

---

## How it works

Instead of importing sequence info and generated atlas images seperately, you'll import a single `.sequence.json` file, pointing to your image sequence and containing instructions on how to generate the atlas. Based on this, `@bsmth/sequence-loader` then generates atlas images and sequence info automatically on the fly.

---

## Installation

```
yarn add --dev @bsmth/sequence-loader @bsmth/loader-cache
```

```
npm i --save-dev @bsmth/sequence-loader @bsmth/loader-cache
```

---

## Setup

You'll need to add the loader and its [cache management plugin](#caching) to your webpack config.

```typescript
import { CachePlugin } from "@bsmth/loader-cache";

export default {
	module: {
		rules: [
			// ...
			{
				test: /\.sequence\.json$/i,
				type: "javascript/auto",
				use: [
					{
						loader: "@bsmth/sequence-loader",
						options: {
							// ...
						},
					},
				],
			},
		],
	},
	plugins: [
		// ...
		new CachePlugin({
			// ...
		}),
	],
};
```

---

## Usage

Inside your project you can now create a `.sequence.json` file, pointing to your image sequence:
_(`"$schema"` is entirely optional, but it'll give you autocomplete and inline validation support.)_

```json
{
	"$schema": "https://unpkg.com/@bsmth/sequence-loader/schema/SequenceOptions.json",
	"files": "./path/to/my/sequence/*.png"
}
```

There are also [some other options](#sequence-json-options).

Now, you can import that JSON:

```typescript
import mySequence from "./my.sequence.json";
```

By default, `mySequence` will give you the following object:

```typescript
{
	width: number,      // size of sequence
	height: number,
	pages: [
		{
			width: number,  // size of page
			height: number,
			img: unknown,   // whatever your image loader outputs
		},
		// ...
	],
	frames: [
		{
			frame: number,  // frame index
			x: number,      // position on page
			y: number,
			width: number,  // size of frame on page
			height: number,
			page: number,   // index of page including ths frame
			padding: {      // amount of 'whitespace' trimmed
				top: number,
				right: number,
				bottom: number,
				left: number,
			},
		},
		// ...
	],
}
```

You can also get the info in the same format used by `TexturePacker`, by adding `"format": "TexturePacker"` to your `.sequence.json`:

```typescript
[
	{
		meta: {
			version: string,
			format: string,
			image: unknown, // whatever your image loader outputs
			scale: number,
			size: {
				w: number,
				h: number,
			},
		},
		frames: {
			"frame-000": {
				rotated: boolean,
				trimmed: boolean,
				frame: {
					w: number,
					h: number,
					x: number,
					y: number,
				},
				spriteSourceSize: {
					w: number,
					h: number,
					x: number,
					y: number,
				},
				sourceSize: {
					w: number,
					h: number,
				},
			},
			// ...
		},
	},
	// ...
];
```

Note that you'll receive an array of pages, since `TexturePacker` would create a separate JSON file for each.

---

## Config

### `.sequence.json` options

| Name            | Type        | Default           | Description                                                  |
| --------------- | ----------- | ----------------- | ------------------------------------------------------------ |
| `files`         | `string`    | `'./*.{png,jpg}'` | A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern pointing to your sequence frames.<br />This is relative to the .json you're importing. |
| `scale`         | `number`    | `1`               | A scalar applied to your frames before being packed.<br />Useful if the frames are at a higher resolution than the final animation. |
| `padding`       | `number`    | `0`               | Amout of pixels in between the packed frames.<br />Useful if you see bleeding at the frame edges. |
| `trim`          | `boolean`   | `true`            | Whether to trim 'uninteresting' pixels off the frame edges.<br />This reduces file size, but you'll need to reconstruct the trimmed areas manually. |
| `trimThreshold` | `number`    | `1`               | The threshold below which a pixel will be considered 'uninteresting'.<br />This represents the maximum difference from the top-left pixel of the image. |
| `relative`      | `boolean`   | `false`           | Whether to output coordinates relative to the page instead of pixel coordinates.<br />Useful if the output image is being resized. |
| `pageMaxWidth`  | `number`    | `4096`            | Maximum width in pixels a page image (atlas) may be.<br />Note that multiple pages may be created to fit all frames. |
| `pageMaxHeight` | `number`    | `4096`            | Maximum height in pixels a page image (atlas) may be.<br />Note that multiple pages may be created to fit all frames. |
| `format`        | `'default'` | `'TexturePacker'` | `'default'`                                                  |
| `imageQuery`    | `string`    | `''`              | Query string appended to the generated image imports.<br />Useful if you want to pass info to your image loader. |

### Loader options

You can also add the above options as loader options. The'll act as defaults.
Additionally loader-specific options are:

| Name                   | Type      | Default      | Description                                                  |
| ---------------------- | --------- | ------------ | ------------------------------------------------------------ |
| `generateDeclarations` | `boolean` | `false`      | Whether to output a .d.ts files next to imported JSONs.<br />This provides correct types based on your settings. |
| `output`               | `'esm'`   | `'commonjs'` | `'esm'`                                                      |

---

## Typescript

`@bsmth/sequence-loader` can auto-generate declarations for your sequences!

By setting `generateDeclarations` to `true` in the loader config, `@bsmth/sequence-loader` will emit a `.d.ts` file next to each `.sequence.json` file you're importing, containing types for that specific sequence. Image import types are mapped to whatever the type of `*.png` is in your setup.

---

## Caching

`@bsmth/sequence-loader` will cache all processed images and intermediates on disk. This is handled by the `CachePlugin` exported by `@bsmth/loader-cache`, which [accepts some options](https://github.com/project-bismuth/loader-cache#options).

---

## Pitfalls/Shortcomings

### Working with git / CI

Without an up to date cache, `@bsmth/sequence-loader` will create all atlases on startup. This can lead to insanely long build- and startup times. To circumvent this, it may be desirable to push the entire cache directory (`.bsmth-loader-cache`) to git LFS. While this is not ideal, all renditions will only be created once and reused on subsequent runs.

---

## To-dos

-   [ ] better documentation
-   [ ] examples
-   [ ] tests

---

## License

© 2021 the project bismuth authors, licensed under MIT.
