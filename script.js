// ====== Конвертации RGB <-> CMYK ======
function rgbToCmyk(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const K = 1 - Math.max(R, G, B);
  if (K === 1) return { C: 0, M: 0, Y: 0, K: 100 };
  const C = (1 - R - K) / (1 - K);
  const M = (1 - G - K) / (1 - K);
  const Y = (1 - B - K) / (1 - K);
  return { C: C * 100, M: M * 100, Y: Y * 100, K: K * 100 };
}

function cmykToRgb(C, M, Y, K) {
  C /= 100; M /= 100; Y /= 100; K /= 100;
  const R = (1 - C) * (1 - K);
  const G = (1 - M) * (1 - K);
  const B = (1 - Y) * (1 - K);
  return { r: Math.round(R * 255), g: Math.round(G * 255), b: Math.round(B * 255) };
}

// ====== Конвертации RGB <-> LAB ======
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToXyz(r8, g8, b8) {
  const r = srgbToLinear(r8 / 255);
  const g = srgbToLinear(g8 / 255);
  const b = srgbToLinear(b8 / 255);
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  return { X, Y, Z };
}

function xyzToRgbWithClipping(X, Y, Z) {
  // linear RGB
  let rLin = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  let gLin = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  let bLin = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  let r = linearToSrgb(rLin);
  let g = linearToSrgb(gLin);
  let b = linearToSrgb(bLin);

  const clipped = { r: false, g: false, b: false };
  const rOrig = r, gOrig = g, bOrig = b;
  r = Math.min(1, Math.max(0, r)); clipped.r = (r !== rOrig);
  g = Math.min(1, Math.max(0, g)); clipped.g = (g !== gOrig);
  b = Math.min(1, Math.max(0, b)); clipped.b = (b !== bOrig);

  return { r8: Math.round(r * 255), g8: Math.round(g * 255), b8: Math.round(b * 255), clipped };
}

const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;

function fLab(t) {
  const eps = Math.pow(6 / 29, 3);
  const k = Math.pow(29 / 6, 2) / 3;
  return t > eps ? Math.cbrt(t) : k * t + 4 / 29;
}
function fInv(ft) {
  const thr = 6 / 29;
  return ft > thr ? Math.pow(ft, 3) : (ft - 4 / 29) * 3 / Math.pow(29 / 6, 2);
}

function xyzToLab(X, Y, Z) {
  const fx = fLab(X / Xn);
  const fy = fLab(Y / Yn);
  const fz = fLab(Z / Zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}

function labToXyz(L, a, b) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = Xn * fInv(fx);
  const Y = Yn * fInv(fy);
  const Z = Zn * fInv(fz);
  return { X, Y, Z };
}

// ====== Работа с DOM ======
const els = {
  R: document.getElementById("R"),
  G: document.getElementById("G"),
  B: document.getElementById("B"),
  Rrange: document.getElementById("Rrange"),
  Grange: document.getElementById("Grange"),
  Brange: document.getElementById("Brange"),

  L: document.getElementById("L"),
  a: document.getElementById("a"),
  b: document.getElementById("b"),
  Lrange: document.getElementById("Lrange"),
  arange: document.getElementById("arange"),
  brange: document.getElementById("brange"),

  C: document.getElementById("C"),
  M: document.getElementById("M"),
  Y: document.getElementById("Y"),
  K: document.getElementById("K"),
  Crange: document.getElementById("Crange"),
  Mrange: document.getElementById("Mrange"),
  Yrange: document.getElementById("Yrange"),
  Krange: document.getElementById("Krange"),

  preview: document.getElementById("preview"),
  warning: document.getElementById("warning")
};

// Флаг, чтобы не зациклить обновления
let isUpdating = false;

// ====== Утилиты установки значений в UI ======
function setRGB(r, g, b) {
  els.R.value = r; els.G.value = g; els.B.value = b;
  els.Rrange.value = r; els.Grange.value = g; els.Brange.value = b;
  els.preview.style.background = `rgb(${r}, ${g}, ${b})`;
}

function setLAB(L, a, b) {
  els.L.value = L.toFixed(1);
  els.a.value = a.toFixed(1);
  els.b.value = b.toFixed(1);
  els.Lrange.value = Number(L.toFixed(1));
  els.arange.value = Number(a.toFixed(1));
  els.brange.value = Number(b.toFixed(1));
}

function setCMYK(C, M, Y, K) {
  els.C.value = C.toFixed(1);
  els.M.value = M.toFixed(1);
  els.Y.value = Y.toFixed(1);
  els.K.value = K.toFixed(1);
  els.Crange.value = Number(C.toFixed(1));
  els.Mrange.value = Number(M.toFixed(1));
  els.Yrange.value = Number(Y.toFixed(1));
  els.Krange.value = Number(K.toFixed(1));
}

function showWarning(text) {
  els.warning.textContent = text || "";
}

// ====== Основные обновления ======
function updateFromRGB() {
  if (isUpdating) return;
  isUpdating = true;

  // Чтение
  const r = clampInt(els.R.value, 0, 255);
  const g = clampInt(els.G.value, 0, 255);
  const b = clampInt(els.B.value, 0, 255);

  // Обновить RGB UI
  setRGB(r, g, b);

  // CMYK
  const cmyk = rgbToCmyk(r, g, b);
  setCMYK(cmyk.C, cmyk.M, cmyk.Y, cmyk.K);

  // LAB
  const xyz = rgbToXyz(r, g, b);
  const lab = xyzToLab(xyz.X, xyz.Y, xyz.Z);
  setLAB(lab.L, lab.a, lab.b);

  showWarning(""); // при вводе RGB вне гамута не бывает
  isUpdating = false;
}

function updateFromLAB() {
  if (isUpdating) return;
  isUpdating = true;

  // Чтение
  const L = clampFloat(els.L.value, 0, 100);
  const a = clampFloat(els.a.value, -128, 127);
  const b = clampFloat(els.b.value, -128, 127);

  // Обновить LAB UI
  setLAB(L, a, b);

  // LAB -> XYZ -> RGB (с клиппингом)
  const xyz = labToXyz(L, a, b);
  const rgb = xyzToRgbWithClipping(xyz.X, xyz.Y, xyz.Z);
  setRGB(rgb.r8, rgb.g8, rgb.b8);

  // CMYK
  const cmyk = rgbToCmyk(rgb.r8, rgb.g8, rgb.b8);
  setCMYK(cmyk.C, cmyk.M, cmyk.Y, cmyk.K);

  // Предупреждение о клиппинге
  const clippedChannels = [];
  if (rgb.clipped.r) clippedChannels.push("R");
  if (rgb.clipped.g) clippedChannels.push("G");
  if (rgb.clipped.b) clippedChannels.push("B");
  if (clippedChannels.length) {
    showWarning(`Цвет вне гамута sRGB: клиппинг по каналам ${clippedChannels.join(", ")}.`);
  } else {
    showWarning("");
  }

  isUpdating = false;
}

function updateFromCMYK() {
  if (isUpdating) return;
  isUpdating = true;

  // Чтение
  const C = clampFloat(els.C.value, 0, 100);
  const M = clampFloat(els.M.value, 0, 100);
  const Y = clampFloat(els.Y.value, 0, 100);
  const K = clampFloat(els.K.value, 0, 100);

  // Обновить CMYK UI
  setCMYK(C, M, Y, K);

  // CMYK -> RGB
  const rgb = cmykToRgb(C, M, Y, K);
  setRGB(rgb.r, rgb.g, rgb.b);

  // RGB -> LAB
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const lab = xyzToLab(xyz.X, xyz.Y, xyz.Z);
  setLAB(lab.L, lab.a, lab.b);

  showWarning(""); // CMYK -> RGB может быть не ICC-точно, но клиппинг уже в RGB
  isUpdating = false;
}

// ====== Хелперы ======
function clampInt(val, min, max) {
  let n = parseInt(val);
  if (isNaN(n)) n = min;
  return Math.min(max, Math.max(min, n));
}
function clampFloat(val, min, max) {
  let n = parseFloat(val);
  if (isNaN(n)) n = min;
  return Math.min(max, Math.max(min, n));
}

// ====== Привязка событий (number и range синхронно) ======
// RGB
bindPair(els.R, els.Rrange, updateFromRGB);
bindPair(els.G, els.Grange, updateFromRGB);
bindPair(els.B, els.Brange, updateFromRGB);

// LAB
bindPair(els.L, els.Lrange, updateFromLAB);
bindPair(els.a, els.arange, updateFromLAB);
bindPair(els.b, els.brange, updateFromLAB);

// CMYK
bindPair(els.C, els.Crange, updateFromCMYK);
bindPair(els.M, els.Mrange, updateFromCMYK);
bindPair(els.Y, els.Yrange, updateFromCMYK);
bindPair(els.K, els.Krange, updateFromCMYK);

function bindPair(numberEl, rangeEl, handler) {
  numberEl.addEventListener("input", () => {
    rangeEl.value = numberEl.value;
    handler();
  });
  rangeEl.addEventListener("input", () => {
    numberEl.value = rangeEl.value;
    handler();
  });
}

// ====== Инициализация ======
(function init() {
  // начальное состояние: красный
  setRGB(255, 0, 0);
  const cmyk = rgbToCmyk(255, 0, 0);
  setCMYK(cmyk.C, cmyk.M, cmyk.Y, cmyk.K);
  const xyz = rgbToXyz(255, 0, 0);
  const lab = xyzToLab(xyz.X, xyz.Y, xyz.Z);
  setLAB(lab.L, lab.a, lab.b);
  showWarning("");
})();

// ====== Добавим обработчик для палитры ======
const colorPicker = document.getElementById("colorPicker");

colorPicker.addEventListener("input", () => {
  const hex = colorPicker.value; // #rrggbb
  const r = parseInt(hex.substr(1,2),16);
  const g = parseInt(hex.substr(3,2),16);
  const b = parseInt(hex.substr(5,2),16);

  // Обновляем всё через RGB
  els.R.value = r; els.G.value = g; els.B.value = b;
  els.Rrange.value = r; els.Grange.value = g; els.Brange.value = b;
  updateFromRGB();
});

// ====== Инициализация ======
(function init() {
  setRGB(255, 0, 0);
  const cmyk = rgbToCmyk(255, 0, 0);
  setCMYK(cmyk.C, cmyk.M, cmyk.Y, cmyk.K);
  const xyz = rgbToXyz(255, 0, 0);
  const lab = xyzToLab(xyz.X, xyz.Y, xyz.Z);
  setLAB(lab.L, lab.a, lab.b);
  showWarning("");
})();