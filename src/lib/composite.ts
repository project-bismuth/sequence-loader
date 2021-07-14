import sharp, { OverlayOptions, Sharp } from 'sharp';


interface CompositeProps {
	initial: Sharp;
	jobs: OverlayOptions[];
	concurrency?: number;
}

// Running sharp.composite with too many commands may
// cause a stack overflow on some systems.
// To circumvent this, we run the commands in several
// waves and write to an intermediate buffer.
export default async function composite({
	initial,
	jobs,
	concurrency = 64,
}: CompositeProps ): Promise<Buffer> {
	const currentJobs = jobs.slice( 0, concurrency );
	const remainingJobs = jobs.slice( currentJobs.length );

	const buffer = await initial.composite( currentJobs ).png().toBuffer();

	if ( remainingJobs.length === 0 ) {
		return buffer;
	}

	return composite({
		initial: sharp( buffer ),
		jobs: remainingJobs,
		concurrency,
	});
}
