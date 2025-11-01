import './style.css';

const samples = new Map<string, HTMLImageElement>();

function createTestImages(): void {
  // 1) Noisy image
  const noisy = document.createElement('img');
  noisy.src = generateNoisyDataURL(400, 300);
  samples.set('Noisy', noisy);

  // 2) Blurred (generate gradient and blur in canvas)
  const blurred = document.createElement('img');
  blurred.src = generateBlurredDataURL(400, 300);
  samples.set('Blurred', blurred);

  // 3) Low contrast gradient
  const lowc = document.createElement('img');
  lowc.src = generateLowContrastGradient(400, 300);
  samples.set('Low contrast', lowc);

  // 4) Striped texture
  const stripes = document.createElement('img');
  stripes.src = generateStriped(400, 300);
  samples.set('Striped', stripes);
}

function generateNoisyDataURL(w: number, h: number): string {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i+1] = v;
    img.data[i+2] = v;
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function generateLowContrastGradient(w: number, h: number): string {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = 100 + Math.floor((y / h) * 55); // narrow range 100..155
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function generateStriped(w: number, h: number): string {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const v = (Math.floor(y / 6) % 2) ? 40 : 220;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function generateBlurredDataURL(w: number, h: number): string {
  // create a gradient and apply simple box blur by downscale/upscale
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#222'); g.addColorStop(1,'#ddd');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  // downscale/upscale to blur
  const t = document.createElement('canvas'); t.width = Math.max(1, Math.floor(w/10)); t.height = Math.max(1, Math.floor(h/10));
  t.getContext('2d')!.drawImage(c,0,0,t.width,t.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(t,0,0,w,h);
  return c.toDataURL();
}

function setImageToCanvas(img: HTMLImageElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth || 400; canvas.height = img.naturalHeight || 300;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function getImageData(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height);
}

function putImageData(canvas: HTMLCanvasElement, data: ImageData): void {
  canvas.width = data.width; canvas.height = data.height;
  canvas.getContext('2d')!.putImageData(data,0,0);
}

function computeLuminanceHistogram(data: ImageData): Uint32Array {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i], g = data.data[i+1], b = data.data[i+2];
    // Rec.601 luma
    const y = Math.round(0.2989 * r + 0.5870 * g + 0.1140 * b);
    hist[y]++;
  }
  return hist;
}

function drawHistogram(hist: Uint32Array, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  // normalize
  let max = 0;
  for (let i = 0; i < hist.length; i++) max = Math.max(max, hist[i]);
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#333';
  const barW = w / 256;
  for (let i = 0; i < 256; i++) {
    const val = hist[i] / Math.max(1, max);
    const bh = Math.round(val * h);
    ctx.fillRect(i * barW, h - bh, Math.ceil(barW), bh);
  }
}

function getGrayscale(data: ImageData): Uint8ClampedArray {
  const out = new Uint8ClampedArray((data.width * data.height));
  for (let i = 0, j = 0; i < data.data.length; i += 4, j++) {
    const r = data.data[i], g = data.data[i+1], b = data.data[i+2];
    out[j] = Math.round(0.2989 * r + 0.5870 * g + 0.1140 * b);
  }
  return out;
}

function grayscaleToImageData(gray: Uint8ClampedArray, width: number, height: number): ImageData {
  const out = new ImageData(width, height);
  for (let i = 0, j = 0; j < gray.length; j++, i += 4) {
    out.data[i] = out.data[i+1] = out.data[i+2] = gray[j];
    out.data[i+3] = 255;
  }
  return out;
}

// Otsu global threshold
function otsuThreshold(data: ImageData): {threshold:number, result: ImageData} {
  const hist = computeLuminanceHistogram(data);
  const total = data.width * data.height;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0; let wB = 0; let wF = 0; let varMax = 0; let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) { varMax = varBetween; threshold = t; }
  }
  const gray = getGrayscale(data);
  const outGray = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) outGray[i] = gray[i] > threshold ? 255 : 0;
  return { threshold, result: grayscaleToImageData(outGray, data.width, data.height) };
}

// Adaptive mean thresholding (simple)
function adaptiveMeanThreshold(data: ImageData, blockSize: number, C: number): ImageData {
  const w = data.width, h = data.height;
  const gray = getGrayscale(data);
  const out = new Uint8ClampedArray(gray.length);
  const r = Math.floor(blockSize / 2);
  // build integral image for fast mean
  const integral = new Uint32Array((w+1)*(h+1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y*w + x];
      integral[(y+1)*(w+1) + (x+1)] = integral[y*(w+1) + (x+1)] + rowSum;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - r), y1 = Math.max(0, y - r);
      const x2 = Math.min(w -1, x + r), y2 = Math.min(h -1, y + r);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[(y2+1)*(w+1) + (x2+1)] - integral[(y1)*(w+1) + (x2+1)] - integral[(y2+1)*(w+1) + (x1)] + integral[(y1)*(w+1) + (x1)];
      const mean = sum / area;
      out[y*w + x] = gray[y*w + x] > (mean - C) ? 255 : 0;
    }
  }
  return grayscaleToImageData(out, w, h);
}

// Morphological operations on grayscale image
function dilateGray(gray: Uint8ClampedArray, w: number, h: number, seRadius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let maxV = 0;
      for (let yy = -seRadius; yy <= seRadius; yy++) {
        const py = Math.min(h - 1, Math.max(0, y + yy));
        for (let xx = -seRadius; xx <= seRadius; xx++) {
          const px = Math.min(w - 1, Math.max(0, x + xx));
          maxV = Math.max(maxV, gray[py*w + px]);
        }
      }
      out[y*w + x] = maxV;
    }
  }
  return out;
}

function erodeGray(gray: Uint8ClampedArray, w: number, h: number, seRadius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minV = 255;
      for (let yy = -seRadius; yy <= seRadius; yy++) {
        const py = Math.min(h - 1, Math.max(0, y + yy));
        for (let xx = -seRadius; xx <= seRadius; xx++) {
          const px = Math.min(w - 1, Math.max(0, x + xx));
          minV = Math.min(minV, gray[py*w + px]);
        }
      }
      out[y*w + x] = minV;
    }
  }
  return out;
}

// median filter implementation (applied per-channel)
function applyMedian(src: ImageData, radius: number): ImageData {
  const w = src.width, h = src.height;
  const dst = new ImageData(w,h);
  const r = radius;
  const windowSize = (2*r+1)*(2*r+1);
  const valsR = new Uint8Array(windowSize);
  const valsG = new Uint8Array(windowSize);
  const valsB = new Uint8Array(windowSize);
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      let k=0;
      for (let yy=-r; yy<=r; yy++){
        const py = Math.min(h-1, Math.max(0, y+yy));
        for (let xx=-r; xx<=r; xx++){
          const px = Math.min(w-1, Math.max(0, x+xx));
          const i = (py*w+px)*4;
          valsR[k]=src.data[i]; valsG[k]=src.data[i+1]; valsB[k]=src.data[i+2]; k++;
        }
      }
      // sort (simple but not optimal)
      valsR.sort(); valsG.sort(); valsB.sort();
      const mid = Math.floor(windowSize/2);
      const di = (y*w+x)*4;
      dst.data[di]=valsR[mid]; dst.data[di+1]=valsG[mid]; dst.data[di+2]=valsB[mid]; dst.data[di+3]=src.data[di+3];
    }
  }
  return dst;
}

// linear contrast stretching
function applyLinearContrast(src: ImageData, low: number, high: number): ImageData {
  const w = src.width, h = src.height;
  const dst = new ImageData(w,h);
  const scale = 255 / Math.max(1, high - low);
  for (let i=0;i<src.data.length;i+=4){
    for (let c=0;c<3;c++){
      let v = src.data[i+c];
      v = Math.min(255, Math.max(0, Math.round((v - low) * scale)));
      dst.data[i+c]=v;
    }
    dst.data[i+3]=src.data[i+3];
  }
  return dst;
}

// histogram equalization on each RGB channel independently
function equalizeRGB(src: ImageData): ImageData {
  const w = src.width, h = src.height;
  const dst = new ImageData(w,h);
  // compute histograms
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i=0;i<src.data.length;i+=4){ hist[0][src.data[i]]++; hist[1][src.data[i+1]]++; hist[2][src.data[i+2]]++; }
  const luts = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
  for (let c=0;c<3;c++){
    let sum=0; for (let v=0;v<256;v++){ sum+=hist[c][v]; luts[c][v]=Math.round((sum- hist[c][0])/(w*h-1)*255); }
  }
  for (let i=0;i<src.data.length;i+=4){ dst.data[i]=luts[0][src.data[i]]; dst.data[i+1]=luts[1][src.data[i+1]]; dst.data[i+2]=luts[2][src.data[i+2]]; dst.data[i+3]=src.data[i+3]; }
  return dst;
}

// HLS helpers and equalization of lightness
function rgbToHls(r:number,g:number,b:number){
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, l=(max+min)/2; let s=0;
  if (max!==min){ const d=max-min; s = l>0.5? d/(2-max-min): d/(max+min);
    switch(max){case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d+2;break; case b: h=(r-g)/d+4;break}
    h/=6;
  }
  return [h,l,s];
}
function hlsToRgb(h:number,l:number,s:number){
  if (s===0){ const v=Math.round(l*255); return [v,v,v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb=(p2:number,q2:number,t:number)=>{ let tt=t; if (tt<0) tt+=1; if (tt>1) tt-=1; if (tt<1/6) return p2 + (q2-p2)*6*tt; if (tt<1/2) return q2; if (tt<2/3) return p2 + (q2-p2)*(2/3-tt)*6; return p2; };
  const r=hue2rgb(p,q,h+1/3); const g=hue2rgb(p,q,h); const b=hue2rgb(p,q,h-1/3);
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

function equalizeHlsL(src:ImageData):ImageData{
  const w=src.width,h=src.height; const dst=new ImageData(w,h);
  const hist=new Uint32Array(256);
  for (let i=0;i<src.data.length;i+=4){ const l = Math.round(rgbToHls(src.data[i],src.data[i+1],src.data[i+2])[1]*255); hist[l]++; }
  let sum=0; const cdf=new Uint32Array(256); for (let v=0;v<256;v++){ sum+=hist[v]; cdf[v]=sum; }
  const denom=w*h; const lut=new Float32Array(256); for (let v=0;v<256;v++) lut[v]= (cdf[v]-cdf[0])/(denom-1);
  for (let i=0;i<src.data.length;i+=4){ const [h0,l0,s0]=rgbToHls(src.data[i],src.data[i+1],src.data[i+2]); const Lnew=lut[Math.round(l0*255)]; const [r,g,b]=hlsToRgb(h0,Lnew,s0); dst.data[i]=r; dst.data[i+1]=g; dst.data[i+2]=b; dst.data[i+3]=src.data[i+3]; }
  return dst;
}

// UI wiring
createTestImages();
const select = document.getElementById('sample-select') as HTMLSelectElement;
for (const [k] of samples) { const opt = document.createElement('option'); opt.value=k; opt.textContent=k; select.appendChild(opt); }
const canvasSrc = document.getElementById('canvas-src') as HTMLCanvasElement;
const canvasDst = document.getElementById('canvas-dst') as HTMLCanvasElement;
const histSrc = document.getElementById('hist-src') as HTMLCanvasElement;
const histDst = document.getElementById('hist-dst') as HTMLCanvasElement;
const defaultImg = samples.get('Noisy')!;
defaultImg.onload = ()=>{ setImageToCanvas(defaultImg, canvasSrc); setImageToCanvas(defaultImg, canvasDst); updateHistograms(); };
select.value = 'Noisy';
select.addEventListener('change', ()=>{ const img = samples.get(select.value)!; img.onload = ()=>{ setImageToCanvas(img, canvasSrc); setImageToCanvas(img, canvasDst); updateHistograms(); }; if (img.complete) img.onload!(null as any); });

const fileInput = document.getElementById('file-input') as HTMLInputElement;
// update histograms
function updateHistograms(): void {
  try {
    const s = getImageData(canvasSrc);
    const d = getImageData(canvasDst);
    drawHistogram(computeLuminanceHistogram(s), histSrc);
    drawHistogram(computeLuminanceHistogram(d), histDst);
  } catch (e) {
    // ignore if canvases not yet ready
  }
}

// ensure file input also updates histograms after load
fileInput.addEventListener('change', ()=>{ const f = fileInput.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); const im = new Image(); im.onload=()=>{ setImageToCanvas(im, canvasSrc); setImageToCanvas(im, canvasDst); updateHistograms(); URL.revokeObjectURL(url); }; im.src=url; });

document.getElementById('apply-median')!.addEventListener('click', ()=>{ const r = Number((document.getElementById('median-radius') as HTMLInputElement).value); const src = getImageData(canvasSrc); const out = applyMedian(src,r); putImageData(canvasDst,out); updateHistograms(); });
document.getElementById('apply-linear')!.addEventListener('click', ()=>{ const low = Number((document.getElementById('contrast-low') as HTMLInputElement).value); const high = Number((document.getElementById('contrast-high') as HTMLInputElement).value); const src = getImageData(canvasSrc); const out = applyLinearContrast(src,low,high); putImageData(canvasDst,out); updateHistograms(); });
document.getElementById('apply-eq')!.addEventListener('click', ()=>{ const mode = (document.querySelector('input[name="eq-mode"]:checked') as HTMLInputElement).value; const src = getImageData(canvasSrc); if (mode==='rgb') putImageData(canvasDst, equalizeRGB(src)); else putImageData(canvasDst, equalizeHlsL(src)); updateHistograms(); });

document.getElementById('apply-otsu')!.addEventListener('click', ()=>{ const src = getImageData(canvasSrc); const {threshold, result} = otsuThreshold(src); putImageData(canvasDst, result); updateHistograms(); alert('Otsu threshold: ' + threshold); });
document.getElementById('apply-adapt')!.addEventListener('click', ()=>{ const block = Number((document.getElementById('adapt-block') as HTMLInputElement).value); const C = Number((document.getElementById('adapt-c') as HTMLInputElement).value); const src = getImageData(canvasSrc); const out = adaptiveMeanThreshold(src, block, C); putImageData(canvasDst, out); updateHistograms(); });

document.getElementById('apply-morph')!.addEventListener('click', ()=>{ const op = (document.getElementById('morph-op') as HTMLSelectElement).value; const radius = Number((document.getElementById('morph-radius') as HTMLInputElement).value); const src = getImageData(canvasDst); const gray = getGrayscale(src); let resGray: Uint8ClampedArray;
  if (op === 'dilate') resGray = dilateGray(gray, src.width, src.height, radius); else resGray = erodeGray(gray, src.width, src.height, radius);
  putImageData(canvasDst, grayscaleToImageData(resGray, src.width, src.height)); updateHistograms(); });

document.getElementById('reset')!.addEventListener('click', ()=>{ setImageToCanvas(samples.get(select.value)!, canvasDst); updateHistograms(); });
document.getElementById('download')!.addEventListener('click', ()=>{ const a = document.createElement('a'); a.href = (canvasDst as HTMLCanvasElement).toDataURL('image/png'); a.download='processed.png'; a.click(); });

// initialize
setImageToCanvas(defaultImg, canvasSrc); setImageToCanvas(defaultImg, canvasDst);
