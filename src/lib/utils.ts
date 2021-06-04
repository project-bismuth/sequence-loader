export function xorInplace( a: Buffer, b: Buffer ): Buffer {
	const length = Math.min( a.length, b.length );

	for ( let i = 0; i < length; i += 1 ) {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		a[i] ^= b[i];
	}

	return a;
}


export function omit<
	K extends( keyof O )[],
	O,
>(
	keys: K,
	obj: O ): Omit<O, K[number]> {
	return keys.reduce( ( a, e ) => {
		const { [e]: discard, ...rest } = a;
		return rest;
	}, obj );
}
