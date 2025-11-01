import './style.css';

import { Color, RGB, HLS, CMYK } from './colors';

let globalColor: RGB = new RGB(0, 0, 0);

const rgb: RGB = new RGB(0, 0, 0);
const hls: HLS = new HLS(0, 0, 0);
const cmyk: CMYK = new CMYK(0, 0, 0, 0);

rgb.fromRgb(globalColor);
hls.fromRgb(rgb);
cmyk.fromRgb(rgb);

// Local storage key for persisting the selected color
const LOCAL_KEY = 'lab01.selectedColorHex';

/** Load saved color from localStorage (hex) and apply to globalColor if 3present. */
function loadSavedColor(): void {
	try {
		const saved = localStorage.getItem(LOCAL_KEY);
		if (!saved) return;
		if (/^#?[0-9a-fA-F]{6}$/.test(saved)) {
			const hex = saved.startsWith('#') ? saved.slice(1) : saved;
			globalColor.r = parseInt(hex.substring(0, 2), 16);
			globalColor.g = parseInt(hex.substring(2, 4), 16);
			globalColor.b = parseInt(hex.substring(4, 6), 16);
			// propagate to other models
			rgb.fromRgb(globalColor);
			hls.fromRgb(globalColor);
			cmyk.fromRgb(globalColor);
		}
	} catch (e) {
		// ignore storage errors
	}
}

/** Save globalColor as hex into localStorage. */
function saveColorToStorage(): void {
	try {
		const hex = '#'.concat(
			toHexComponent(globalColor.r),
			toHexComponent(globalColor.g),
			toHexComponent(globalColor.b),
		);
		localStorage.setItem(LOCAL_KEY, hex);
	} catch (e) {
		// ignore storage errors
	}
}

/** Reset persisted color and UI to default (black). */
function resetToDefault(): void {
	try {
		localStorage.removeItem(LOCAL_KEY);
	} catch (e) {
		// ignore
	}
	globalColor = new RGB(0, 0, 0);
	rgb.fromRgb(globalColor);
	hls.fromRgb(globalColor);
	cmyk.fromRgb(globalColor);
	update('', null);
	showCopyToast('Reset to default');
}

// load saved color (if any) before building UI so initial inputs reflect it
loadSavedColor();

/**
 * Create an input filter function that keeps values within slider bounds.
 * @param slider Tuple of [min, max, step]
 * @param input Input element whose value will be kept in-range
 * @returns Event handler for input events
 */
function makeFilter(slider: [number, number, number], input: HTMLInputElement) {
	return (e: Event): void => {
		const target = e.target as HTMLInputElement | null;
		if (!target) {
			return;
		}

		const v = parseFloat(target.value);
		if (Number.isNaN(v)) {
			input.value = String(slider[0]);
			target.value = input.value;
			return;
		}

		if (v < slider[0]) {
			input.value = String(slider[0]);
		} else if (v > slider[1]) {
			input.value = String(slider[1]);
		} else {
			input.value = String(v);
		}

		if (slider[2] >= 1) {
			input.value = String(Math.round(parseFloat(input.value)));
		}

		if (input.value === '') {
			input.value = String(slider[0]);
		}

		target.value = input.value;
	};
}

/**
 * Return single-character property names from a record.
 * @param o Record to inspect
 */
function getFields(o: Color): string[] {
	return o.getFieldNames();
}

interface TiedField {
	object: Color;
	fieldName: string;
	input: HTMLInputElement;
}

const tiedFields: TiedField[] = [];

/** Convert 0-255 number to two-digit hex string. */
function toHexComponent(col: number): string {
	const c = Math.max(0, Math.min(255, Math.round(col)));
	return c.toString(16).padStart(2, '0');
}

/**
 * Update UI values from global color, skipping an optionally ignored field/input.
 * @param ignoredColor Either a color name to skip or a Color instance
 * @param ignoredInput Input element to skip updating (or null)
 */
function update(ignoredColor: string | Color, ignoredInput: HTMLInputElement | null): void {
	if (ignoredColor !== 'rgb') {
		rgb.fromRgb(globalColor);
	}
	if (ignoredColor !== 'hls') {
		hls.fromRgb(globalColor);
	}
	if (ignoredColor !== 'cmyk') {
		cmyk.fromRgb(globalColor);
	}

	for (const o of tiedFields) {
		if (!ignoredInput || o.input.id !== ignoredInput.id) {
				const raw = o.object.getField(o.fieldName) ?? 0;
				// show HLS and CMYK values with two decimal places
				if ((o.object as any).colorName === 'hls' || (o.object as any).colorName === 'cmyk') {
					o.input.value = Number(raw).toFixed(2);
				} else {
					o.input.value = String(raw);
				}
		}
	}

	const selector = document.getElementById('selector') as HTMLInputElement | null;
	if (selector) {
		const hex = '#'.concat(
			toHexComponent(globalColor.r),
			toHexComponent(globalColor.g),
			toHexComponent(globalColor.b),
		);
		selector.value = hex;
		const preview = document.getElementById('color-preview') as HTMLDivElement | null;
		if (preview) {
			preview.style.backgroundColor = hex;
			preview.textContent = hex;
			// pick contrasting text color for readability
			const contrast = getContrastColor(globalColor.r, globalColor.g, globalColor.b);
			preview.style.color = contrast;
		}
			// persist the color so it survives reloads
			saveColorToStorage();
	}
}

/** Return either '#000' or '#fff' to contrast given RGB values (0..255). */
function getContrastColor(r: number, g: number, b: number): string {
  // YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000' : '#fff';
}

/**
 * Create UI controls for a color field.
 * @param color Color object with slider metadata
 * @param fieldName single-letter field name (e.g. 'r', 'g', 'b')
 */
function getInput(color: Color, fieldName: string): HTMLDivElement {
	const input = document.createElement('input') as HTMLInputElement;
	const slider = color.slider[fieldName] as [number, number, number];
		const initialRaw = color.getField(fieldName) ?? slider[0];
		if (color.colorName === 'hls' || color.colorName === 'cmyk') {
			input.value = Number(initialRaw).toFixed(2);
		} else {
			input.value = String(initialRaw);
		}
	input.type = 'text';
	input.id = fieldName + color.colorName;
	input.addEventListener('input', makeFilter(slider, input));
	input.addEventListener('input', (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (Number.isNaN(Number(target.value)) || Number.isNaN(parseFloat(target.value))) {
			target.value = String(slider[0]);
			input.value = String(slider[0]);
		}

		color.setField(fieldName, parseFloat(target.value));
		globalColor.fromRgb(color.toRgb());
		update(color.colorName, input);
	});

	input.step = String(slider[2]);
	const label = document.createElement('label');
	label.htmlFor = input.id;
	label.textContent = `${fieldName}: `;

	const docSlider = document.createElement('input') as HTMLInputElement;
	docSlider.min = String(slider[0]);
	docSlider.max = String(slider[1]);
	docSlider.step = String(slider[2]);
	docSlider.type = 'range';
	docSlider.id = fieldName + color.colorName + 'range';
	docSlider.addEventListener('input', (e: Event) => {
		const target = e.target as HTMLInputElement;
		color.setField(fieldName, parseFloat(target?.value ?? '0'));
		globalColor.fromRgb(color.toRgb());
		update(color.colorName, docSlider);
	});

			// range inputs use numeric strings; keep value in raw numeric form
			docSlider.value = String(color.getField(fieldName) ?? slider[0]);
	const div = document.createElement('div');
	div.append(label, input, docSlider);

	tiedFields.push({ object: color, fieldName, input });
	tiedFields.push({ object: color, fieldName, input: docSlider });

	div.classList.add('selector-row');
	return div;
}

function getInfo(color: Color): HTMLDivElement {
	const fields = getFields(color);
	const div = document.createElement('div');
	for (const field of fields) {
		div.append(getInput(color as Color & Record<string, any>, field));
	}

	return div;
}

document.getElementById('rgb')?.appendChild(getInfo(rgb));
document.getElementById('hls')?.appendChild(getInfo(hls));
document.getElementById('cmyk')?.appendChild(getInfo(cmyk));

// Initialize UI values from the default global color
update('', null);

// Create copy-toast element used to show a brief popup when hex is copied
const copyToast = document.createElement('div');
copyToast.id = 'copy-toast';
document.body.appendChild(copyToast);

const selectorElem = document.getElementById('selector') as HTMLInputElement | null;
selectorElem?.addEventListener('input', (ev: Event) => {
	const target = ev.target as HTMLInputElement | null;
	if (!target) {
		return;
	}

	const color = target.value;
	globalColor.r = parseInt(color.substring(1, 3), 16);
	globalColor.g = parseInt(color.substring(3, 5), 16);
	globalColor.b = parseInt(color.substring(5, 7), 16);
	update(globalColor, null);
});

const copyBtn = document.getElementById('copy-hex') as HTMLButtonElement | null;
copyBtn?.addEventListener('click', () => {
	const selector = document.getElementById('selector') as HTMLInputElement | null;
	if (!selector) return;
	navigator.clipboard
		?.writeText(selector.value)
		.then(() => showCopyToast(`Copied: ${selector.value}`))
		.catch(() => showCopyToast(`Copied: ${selector.value}`));
});

let copyToastTimer: number | undefined;
function showCopyToast(text: string): void {
	copyToast.textContent = text;
	copyToast.classList.add('visible');
	if (copyToastTimer) {
		window.clearTimeout(copyToastTimer);
	}
	copyToastTimer = window.setTimeout(() => {
		copyToast.classList.remove('visible');
		copyToastTimer = undefined;
	}, 1200);
}

// reset button wiring
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
resetBtn?.addEventListener('click', () => {
	resetToDefault();
});
