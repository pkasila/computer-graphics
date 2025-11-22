

// TypeScript version of the provided reference code
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const logDiv = document.getElementById('log') as HTMLElement;
const latencyInput = document.getElementById('latency') as HTMLInputElement;
const latencyValSpan = document.getElementById('latencyVal') as HTMLSpanElement;
let latency = parseInt(latencyInput.value);

latencyInput.addEventListener('input', (e) => {
    latency = parseInt((e.target as HTMLInputElement).value);
    latencyValSpan.textContent = String(latency);
});

let gridSize = 20;
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;

window.onload = () => {
    resizeCanvas();
    drawGrid();
};
window.onresize = resizeCanvas;

function resizeCanvas() {
    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = canvas.parentElement!.clientHeight;
    centerX = Math.floor(canvas.width / 2);
    centerY = Math.floor(canvas.height / 2);
    drawGrid();
}

function drawGrid() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e0e0e0";
    ctx.beginPath();
    for (let x = centerX; x < canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let x = centerX; x > 0; x -= gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = centerY; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    for (let y = centerY; y > 0; y -= gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.fillText("X", canvas.width - 15, centerY - 5);
    ctx.fillText("Y", centerX + 5, 15);
    ctx.fillText("0", centerX + 2, centerY + 12);
}

function plot(x: number, y: number, opacity: number = 1, color: string = "rgba(255, 0, 0, ") {
    const screenX = centerX + x * gridSize;
    const screenY = centerY - y * gridSize;
    ctx.fillStyle = color + opacity + ")";
    ctx.fillRect(screenX + 1, screenY - gridSize + 1, gridSize - 1, gridSize - 1);
}


function clearCanvas(redraw: boolean = true) {
    if (redraw) drawGrid();
}

// Expose to global scope for HTML onclick
(window as any).clearCanvas = clearCanvas;
(window as any).runAlgorithm = runAlgorithm;

async function stepAlgorithm(x1: number, y1: number, x2: number, y2: number): Promise<number> {
    let pixels = 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) { plot(x1, y1); return 1; }
    const steps = Math.abs(dx) > Math.abs(dy) ? Math.abs(dx) : Math.abs(dy);
    const Xinc = dx / steps;
    const Yinc = dy / steps;
    let x = x1;
    let y = y1;
    for (let i = 0; i <= steps; i++) {
        plot(Math.round(x), Math.round(y));
        x += Xinc;
        y += Yinc;
        pixels++;
        if (latency > 0) await sleep(latency);
    }
    return pixels;
}

async function ddaAlgorithm(x1: number, y1: number, x2: number, y2: number): Promise<number> {
    let pixels = 0;
    let dx = x2 - x1;
    let dy = y2 - y1;
    let steps = Math.max(Math.abs(dx), Math.abs(dy));
    let xInc = dx / steps;
    let yInc = dy / steps;
    let x = x1;
    let y = y1;
    for (let i = 0; i <= steps; i++) {
        plot(Math.round(x), Math.round(y));
        x += xInc;
        y += yInc;
        pixels++;
        if (latency > 0) await sleep(latency);
    }
    return pixels;
}

async function bresenhamLine(x1: number, y1: number, x2: number, y2: number): Promise<number> {
    let pixels = 0;
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1;
    let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    while(true) {
        plot(x1, y1);
        pixels++;
        if (latency > 0) await sleep(latency);
        if ((x1 === x2) && (y1 === y2)) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
    return pixels;
}

async function bresenhamCircle(xc: number, yc: number, r: number): Promise<number> {
    let pixels = 0;
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;
    drawCirclePixels(xc, yc, x, y);
    pixels += 8;
    if (latency > 0) await sleep(latency);
    while (y >= x) {
        x++;
        if (d > 0) {
            y--;
            d = d + 4 * (x - y) + 10;
        } else {
            d = d + 4 * x + 6;
        }
        drawCirclePixels(xc, yc, x, y);
        pixels += 8;
        if (latency > 0) await sleep(latency);
    }
    return pixels;
}

function drawCirclePixels(xc: number, yc: number, x: number, y: number) {
    plot(xc + x, yc + y);
    plot(xc - x, yc + y);
    plot(xc + x, yc - y);
    plot(xc - x, yc - y);
    plot(xc + y, yc + x);
    plot(xc - y, yc + x);
    plot(xc + y, yc - x);
    plot(xc - y, yc - x);
}

async function wuAlgorithm(x1: number, y1: number, x2: number, y2: number): Promise<number> {
    let pixels = 0;
    async function plotWu(x: number, y: number, c: number) {
        plot(x, y, c, "rgba(0,0,0,");
        pixels++;
        if (latency > 0) await sleep(latency);
    }
    function ipart(x: number) { return Math.floor(x); }
    function round(x: number) { return Math.round(x); }
    function fpart(x: number) { return x - Math.floor(x); }
    function rfpart(x: number) { return 1 - fpart(x); }
    let dx = x2 - x1;
    let dy = y2 - y1;
    let steep = Math.abs(dy) > Math.abs(dx);
    if (steep) {
        [x1, y1] = [y1, x1];
        [x2, y2] = [y2, x2];
    }
    if (x1 > x2) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }
    dx = x2 - x1;
    dy = y2 - y1;
    let gradient = dy / dx;
    if (dx === 0) gradient = 1.0;
    let xend = round(x1);
    let yend = y1 + gradient * (xend - x1);
    let xgap = rfpart(x1 + 0.5);
    let xpxl1 = xend;
    let ypxl1 = ipart(yend);
    if (steep) {
        await plotWu(ypxl1, xpxl1, rfpart(yend) * xgap);
        await plotWu(ypxl1 + 1, xpxl1, fpart(yend) * xgap);
    } else {
        await plotWu(xpxl1, ypxl1, rfpart(yend) * xgap);
        await plotWu(xpxl1, ypxl1 + 1, fpart(yend) * xgap);
    }
    let intery = yend + gradient;
    xend = round(x2);
    yend = y2 + gradient * (xend - x2);
    xgap = fpart(x2 + 0.5);
    let xpxl2 = xend;
    let ypxl2 = ipart(yend);
    if (steep) {
        await plotWu(ypxl2, xpxl2, rfpart(yend) * xgap);
        await plotWu(ypxl2 + 1, xpxl2, fpart(yend) * xgap);
    } else {
        await plotWu(xpxl2, ypxl2, rfpart(yend) * xgap);
        await plotWu(xpxl2, ypxl2 + 1, fpart(yend) * xgap);
    }
    if (steep) {
        for (let x = xpxl1 + 1; x < xpxl2; x++) {
            await plotWu(ipart(intery), x, rfpart(intery));
            await plotWu(ipart(intery) + 1, x, fpart(intery));
            intery += gradient;
        }
    } else {
        for (let x = xpxl1 + 1; x < xpxl2; x++) {
            await plotWu(x, ipart(intery), rfpart(intery));
            await plotWu(x, ipart(intery) + 1, fpart(intery));
            intery += gradient;
        }
    }
    return pixels;
}

async function runAlgorithm() {
    const algo = (document.getElementById('algoSelect') as HTMLSelectElement).value;
    const x1 = parseInt((document.getElementById('x1') as HTMLInputElement).value);
    const y1 = parseInt((document.getElementById('y1') as HTMLInputElement).value);
    const x2 = parseInt((document.getElementById('x2') as HTMLInputElement).value);
    const y2 = parseInt((document.getElementById('y2') as HTMLInputElement).value);
    let count = 0;
    const t0 = performance.now();
    if (algo === 'bresenhamCircle') {
        count = await bresenhamCircle(x1, y1, x2);
    } else if (algo === 'step') {
        count = await stepAlgorithm(x1, y1, x2, y2);
    } else if (algo === 'dda') {
        count = await ddaAlgorithm(x1, y1, x2, y2);
    } else if (algo === 'bresenhamLine') {
        count = await bresenhamLine(x1, y1, x2, y2);
    } else if (algo === 'wu') {
        count = await wuAlgorithm(x1, y1, x2, y2);
    }
    const t1 = performance.now();
    logDiv.innerHTML = `Время выполнения: ${(t1 - t0).toFixed(3)} мс<br>Закрашено пикселей: ${count}`;
}
// Helper for latency
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(document.getElementById('algoSelect') as HTMLSelectElement).addEventListener('change', function(e) {
    const x2Input = document.getElementById('x2') as HTMLInputElement;
    const y2Input = document.getElementById('y2') as HTMLInputElement;
    if ((e.target as HTMLSelectElement).value === 'bresenhamCircle') {
        document.querySelector('#endCoords label')!.textContent = "Радиус (R):";
        y2Input.style.display = 'none';
        x2Input.placeholder = "R";
    } else {
        document.querySelector('#endCoords label')!.textContent = "Координаты конца (X2, Y2):";
        y2Input.style.display = 'inline-block';
        x2Input.placeholder = "X2";
    }
});

(document.getElementById('zoom') as HTMLInputElement).addEventListener('input', function(e) {
    gridSize = parseInt((e.target as HTMLInputElement).value);
    document.getElementById('zoomVal')!.textContent = String(gridSize);
    drawGrid();
});

canvas.addEventListener('mousemove', function(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const logicX = Math.floor((x - centerX) / gridSize);
    const logicY = Math.floor((centerY - y) / gridSize);
    document.getElementById('mouseCoords')!.textContent = `X: ${logicX}, Y: ${logicY}`;
});

canvas.addEventListener('mousedown', function(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const logicX = Math.floor((x - centerX) / gridSize);
    const logicY = Math.floor((centerY - y) / gridSize);
    if (evt.button === 0) {
        (document.getElementById('x1') as HTMLInputElement).value = String(logicX);
        (document.getElementById('y1') as HTMLInputElement).value = String(logicY);
    } else if (evt.button === 2) {
        const algo = (document.getElementById('algoSelect') as HTMLSelectElement).value;
        if(algo === 'bresenhamCircle') {
            const x1 = parseInt((document.getElementById('x1') as HTMLInputElement).value);
            const y1 = parseInt((document.getElementById('y1') as HTMLInputElement).value);
            const r = Math.round(Math.sqrt(Math.pow(logicX - x1, 2) + Math.pow(logicY - y1, 2)));
            (document.getElementById('x2') as HTMLInputElement).value = String(r);
        } else {
            (document.getElementById('x2') as HTMLInputElement).value = String(logicX);
            (document.getElementById('y2') as HTMLInputElement).value = String(logicY);
        }
        runAlgorithm();
    }
});

canvas.addEventListener('contextmenu', event => event.preventDefault());
