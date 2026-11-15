const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
const main = document.querySelector('#main');
const editButton = document.querySelector('#edit-toggle');
const status = document.querySelector('#edit-status');
const storageKey = 'anisakis-guide-edited-main-v1';
const designKey = 'anisakis-guide-design-v1';
const editTools = document.querySelector('.edit-tools');
if (new URLSearchParams(location.search).get('edit') !== '1') editTools.hidden = true;

const fontChoice = document.querySelector('#font-choice');
const colorChoice = document.querySelector('#color-choice');
const buttonPosition = document.querySelector('#button-position');
const heroInner = document.querySelector('.hero-inner');
let pendingImage = null;

function applyDesign(design = {}) {
  const fonts = {
    default: ["'Noto Sans JP', sans-serif", "'Shippori Mincho', serif"],
    rounded: ["'Yu Gothic UI', 'Meiryo', sans-serif", "'Yu Mincho', 'Hiragino Mincho ProN', serif"],
    serif: ["'Yu Mincho', 'Hiragino Mincho ProN', serif", "'Yu Mincho', 'Hiragino Mincho ProN', serif"]
  };
  const selectedFonts = fonts[design.font] || fonts.default;
  document.body.style.setProperty('--sans', selectedFonts[0]);
  document.body.style.setProperty('--serif', selectedFonts[1]);
  document.body.dataset.palette = design.palette || 'sea';
  heroInner?.setAttribute('data-button-position', design.button || 'left');
  if (fontChoice) fontChoice.value = design.font || 'default';
  if (colorChoice) colorChoice.value = design.palette || 'sea';
  if (buttonPosition) buttonPosition.value = design.button || 'left';
}

function currentDesign() {
  return {
    font: fontChoice?.value || 'default',
    palette: colorChoice?.value || 'sea',
    button: buttonPosition?.value || 'left'
  };
}

function saveDesign() {
  try { localStorage.setItem(designKey, JSON.stringify(currentDesign())); } catch { /* Local saving may be blocked. */ }
}

let savedDesign = {};
try { savedDesign = JSON.parse(localStorage.getItem(designKey) || '{}'); } catch { savedDesign = {}; }
applyDesign(savedDesign);

// Restore this browser's saved text, if present.
try {
  const savedMain = localStorage.getItem(storageKey);
  if (savedMain && main) main.innerHTML = savedMain;
} catch {
  // Editing still works if this browser blocks local storage.
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('open', !isOpen);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

editButton?.addEventListener('click', () => {
  const isEditing = editButton.getAttribute('aria-pressed') === 'true';
  const next = !isEditing;
  editButton.setAttribute('aria-pressed', String(next));
  editButton.textContent = next ? '✓ 編集モード中' : '✎ このページを編集';
  main?.setAttribute('contenteditable', String(next));
  document.body.classList.toggle('edit-active', next);
  document.querySelector('#edit-hint').textContent = next
    ? '見出しや文章をクリックして書き換えてください'
    : '文章を直接クリックして書き換えられます';
});

document.querySelector('#edit-save')?.addEventListener('click', () => {
  try {
    localStorage.setItem(storageKey, main.innerHTML);
    saveDesign();
    status.textContent = 'このブラウザーに保存しました';
  } catch {
    status.textContent = '保存できませんでした。編集版をダウンロードしてください';
  }
});

document.querySelector('#edit-download')?.addEventListener('click', () => {
  const copy = document.documentElement.cloneNode(true);
  copy.querySelector('#main')?.removeAttribute('contenteditable');
  copy.querySelector('body')?.classList.remove('edit-active');
  copy.querySelector('#edit-toggle')?.setAttribute('aria-pressed', 'false');
  const toggle = copy.querySelector('#edit-toggle');
  if (toggle) toggle.textContent = '✎ このページを編集';
  const exportFonts = {
    default: ["'Noto Sans JP', sans-serif", "'Shippori Mincho', serif"],
    rounded: ["'Yu Gothic UI', 'Meiryo', sans-serif", "'Yu Mincho', 'Hiragino Mincho ProN', serif"],
    serif: ["'Yu Mincho', 'Hiragino Mincho ProN', serif", "'Yu Mincho', 'Hiragino Mincho ProN', serif"]
  }[fontChoice?.value || 'default'];
  copy.querySelector('body')?.style.setProperty('--sans', exportFonts[0]);
  copy.querySelector('body')?.style.setProperty('--serif', exportFonts[1]);
  copy.querySelector('body')?.setAttribute('data-palette', colorChoice?.value || 'sea');
  copy.querySelector('.hero-inner')?.setAttribute('data-button-position', buttonPosition?.value || 'left');
  const html = '<!doctype html>\n' + copy.outerHTML;
  const file = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'anisakis-guide-edited.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = '編集版をダウンロードしました';
});

document.querySelector('#edit-reset')?.addEventListener('click', () => {
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(designKey);
    location.reload();
  } catch {
    status.textContent = '保存データを削除できませんでした';
  }
});

fontChoice?.addEventListener('change', () => { applyDesign(currentDesign()); saveDesign(); });
colorChoice?.addEventListener('change', () => { applyDesign(currentDesign()); saveDesign(); });
buttonPosition?.addEventListener('change', () => { applyDesign(currentDesign()); saveDesign(); });

document.querySelector('#image-pick')?.addEventListener('click', () => document.querySelector('#image-file')?.click());
document.querySelector('#image-file')?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    pendingImage = reader.result;
    status.textContent = '画像をセットしました。差し替えたいイラストをクリックしてください';
  });
  reader.readAsDataURL(file);
  event.target.value = '';
});

main?.addEventListener('click', (event) => {
  if (!pendingImage || main.getAttribute('contenteditable') !== 'true') return;
  const artwork = event.target.closest('svg, img');
  if (!artwork) return;
  event.preventDefault();
  event.stopPropagation();
  const replacement = document.createElement('img');
  replacement.src = pendingImage;
  replacement.alt = '差し替えたイラスト';
  replacement.className = 'uploaded-art';
  artwork.replaceWith(replacement);
  pendingImage = null;
  document.body.classList.remove('edit-active');
  document.body.classList.add('edit-active');
  status.textContent = '画像を差し替えました。「この端末に保存」かダウンロードを押してください';
});
