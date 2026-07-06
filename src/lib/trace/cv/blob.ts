// Classical motion detection on typed arrays — the "find the ball" half of Trace.
// Frame-difference → binary mask → largest 4-connected blob centroid.
// No DOM types here: callers hand in raw RGBA bytes (from a canvas) or plain masks,
// which keeps every function unit-testable and Web-Worker-friendly.

export interface Blob {
	/** Pixel count. */
	size: number;
	/** Centroid, in mask pixel coords. */
	cx: number;
	cy: number;
}

/** RGBA bytes → 8-bit luma (Rec.601 weights, same as the validated prototype). */
export function grayscale(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8Array {
	const g = new Uint8Array(w * h);
	for (let i = 0; i < g.length; i++) {
		const j = i * 4;
		g[i] = (rgba[j] * 0.3 + rgba[j + 1] * 0.59 + rgba[j + 2] * 0.11) | 0;
	}
	return g;
}

/** Binary motion mask: 1 where |cur - prev| exceeds the threshold. */
export function diffMask(cur: Uint8Array, prev: Uint8Array, threshold = 28): Uint8Array {
	const mask = new Uint8Array(cur.length);
	for (let i = 0; i < cur.length; i++) if (Math.abs(cur[i] - prev[i]) > threshold) mask[i] = 1;
	return mask;
}

/**
 * Largest 4-connected component of a binary mask (iterative flood fill — clip frames
 * are ~200×110 so an explicit stack is plenty). Returns null for an empty mask.
 */
export function largestBlob(mask: Uint8Array, w: number, h: number): Blob | null {
	const seen = new Uint8Array(w * h);
	let best: Blob | null = null;
	const stack: number[] = [];
	for (let i = 0; i < mask.length; i++) {
		if (!mask[i] || seen[i]) continue;
		let sx = 0,
			sy = 0,
			n = 0;
		stack.push(i);
		while (stack.length) {
			const c = stack.pop()!;
			if (seen[c] || !mask[c]) continue;
			seen[c] = 1;
			const cx = c % w,
				cy = (c / w) | 0;
			sx += cx;
			sy += cy;
			n++;
			if (cx > 0) stack.push(c - 1);
			if (cx < w - 1) stack.push(c + 1);
			if (cy > 0) stack.push(c - w);
			if (cy < h - 1) stack.push(c + w);
		}
		if (!best || n > best.size) best = { size: n, cx: sx / n, cy: sy / n };
	}
	return best;
}
