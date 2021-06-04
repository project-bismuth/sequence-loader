import { promises as fs } from 'fs';


interface GenerateDeclarationProps {
	path: string;
	format: string;
	query: string;
}

export default function generateDeclaration({
	path,
	format,
	query,
}: GenerateDeclarationProps ): Promise<void> {
	const isTP = format === 'TexturePacker';
	const type = isTP ? 'TexturePackerSequence' : 'Sequence';

	const declaration = `
import type img from '*.png${query}';
import type { ${type} } from '@bsmth/sequence-loader/dist/esm/types/${type}';

declare const sequence: ${type}<typeof img>${isTP ? '[]' : ''};
export default sequence;
`;

	return fs.writeFile( `${path}.d.ts`, declaration );
}
