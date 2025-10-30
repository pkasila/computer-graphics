/**
 * Base color class. Subclasses should implement conversion methods and
 * provide typed accessors for UI wiring.
 */
abstract class Color {
	public readonly colorName: string;
	/** Slider spec for UI binding (default empty). */
	public slider: Record<string, [number, number, number]> = {};

	constructor(colorName: string) {
		this.colorName = colorName;
	}

	/** Convert this color to RGB. */
	abstract toRgb(): RGB;

	/** Initialize this color from an RGB value. */
	abstract fromRgb(_rgb: RGB): void;

	/** Return list of field names exposed to the UI (e.g. ['r','g','b']). */
	abstract getFieldNames(): string[];

	/** Read a named field value in a typed way. */
	abstract getField(name: string): number;

	/** Set a named field value in a typed way. */
	abstract setField(name: string, value: number): void;
}

class RGB extends Color {
	public r: number;
	public g: number;
	public b: number;

	public slider: Record<string, [number, number, number]> = {
		r: [0, 255, 1],
		g: [0, 255, 1],
		b: [0, 255, 1],
	};

	constructor(r: number, g: number, b: number) {
		super('rgb');
		this.r = r;
		this.g = g;
		this.b = b;

		// Normalize negative values into 0..255 range.
		while (this.r < 0) {
			this.r += 255;
		}
		while (this.g < 0) {
			this.g += 255;
		}
		while (this.b < 0) {
			this.b += 255;
		}
	}

	fromRgb(rgb: RGB): void {
		this.r = Math.round(rgb.r);
		this.g = Math.round(rgb.g);
		this.b = Math.round(rgb.b);
	}

	getFieldNames(): string[] {
		return ['r', 'g', 'b'];
	}

	getField(name: string): number {
		switch (name) {
			case 'r':
				return this.r;
			case 'g':
				return this.g;
			case 'b':
				return this.b;
			default:
				return 0;
		}
	}

	setField(name: string, value: number): void {
		switch (name) {
			case 'r':
				this.r = value;
				break;
			case 'g':
				this.g = value;
				break;
			case 'b':
				this.b = value;
				break;
			default:
				break;
		}
	}

	toRgb(): RGB {
		return this;
	}
}

class CMYK extends Color {
	public c: number;
	public m: number;
	public y: number;
	public k: number;

	public slider: Record<string, [number, number, number]> = {
		c: [0, 1, 0.01],
		m: [0, 1, 0.01],
		y: [0, 1, 0.01],
		k: [0, 0.99, 0.01],
	};

	constructor(c: number, m: number, y: number, k: number) {
		super('cmyk');
		this.c = c;
		this.m = m;
		this.y = y;
		this.k = k;
	}

	getFieldNames(): string[] {
		return ['c', 'm', 'y', 'k'];
	}

	getField(name: string): number {
		switch (name) {
			case 'c':
				return this.c;
			case 'm':
				return this.m;
			case 'y':
				return this.y;
			case 'k':
				return this.k;
			default:
				return 0;
		}
	}

	setField(name: string, value: number): void {
		switch (name) {
			case 'c':
				this.c = value;
				break;
			case 'm':
				this.m = value;
				break;
			case 'y':
				this.y = value;
				break;
			case 'k':
				this.k = value;
				break;
			default:
				break;
		}
	}

	toRgb(): RGB {
		return new RGB(
			255 * (1 - this.c) * (1 - this.k),
			255 * (1 - this.m) * (1 - this.k),
			255 * (1 - this.y) * (1 - this.k),
		);
	}

	fromRgb(rgb: RGB): void {
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;
		this.k = Math.min(this.slider.k[1], 1 - Math.max(r, g, b));

		if (1 - this.k === 0) {
			this.c = 0;
			this.m = 0;
			this.y = 0;
		} else {
			this.c = (1 - r - this.k) / (1 - this.k);
			this.m = (1 - g - this.k) / (1 - this.k);
			this.y = (1 - b - this.k) / (1 - this.k);
		}
	}
}

class HLS extends Color {
	public h: number;
	public l: number;
	public s: number;

	public slider: Record<string, [number, number, number]> = {
		h: [0, 0.99, 0.01],
		l: [0, 0.99, 0.01],
		s: [0, 0.99, 0.01],
	};

	constructor(h: number, l: number, s: number) {
		super('hls');
		this.h = h;
		this.l = l;
		this.s = s;
	}

	/** Convert HLS (HSL) to RGB. h,l,s are expected in range [0,1]. */
	toRgb(): RGB {
		const h = this.h;
		const l = this.l;
		const s = this.s;

		if (s === 0) {
			const gray = l * 255;
			return new RGB(gray, gray, gray);
		}

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;

		const hue2rgb = (p2: number, q2: number, t: number): number => {
			let tt = t;
			if (tt < 0) tt += 1;
			if (tt > 1) tt -= 1;
			if (tt < 1 / 6) return p2 + (q2 - p2) * 6 * tt;
			if (tt < 1 / 2) return q2;
			if (tt < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - tt) * 6;
			return p2;
		};

		const r = hue2rgb(p, q, h + 1 / 3) * 255;
		const g = hue2rgb(p, q, h) * 255;
		const b = hue2rgb(p, q, h - 1 / 3) * 255;

		return new RGB(r, g, b);
	}

	/** Convert RGB to HLS (HSL). RGB components expected 0..255. */
	fromRgb(rgb: RGB): void {
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2;
		let h = 0;
		let s = 0;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}

			h /= 6;
		}

		this.h = h;
		this.l = l;
		this.s = s;
	}

	getFieldNames(): string[] {
		return ['h', 'l', 's'];
	}

	getField(name: string): number {
		switch (name) {
			case 'h':
				return this.h;
			case 'l':
				return this.l;
			case 's':
				return this.s;
			default:
				return 0;
		}
	}

	setField(name: string, value: number): void {
		switch (name) {
			case 'h':
				this.h = value;
				break;
			case 'l':
				this.l = value;
				break;
			case 's':
				this.s = value;
				break;
			default:
				break;
		}
	}
}



export { Color, RGB, HLS, CMYK };
