'use strict';

// Set the official Solana token address here after the launch is announced.
const UNTILO_CONTRACT_ADDRESS = 'G2PCm9s2chYWr6PTZBxJFYdRfAwTtv1jr6rUe2japump';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const studio = $('#studio');
const form = $('#project-form');
const storageKey = 'untilo-project-brief-v1';
const palettes = {
  electric: {accent: '#0046fd', soft: '#edf2ff', ink: '#131d35', label: 'Electric blue'},
  midnight: {accent: '#7851e8', soft: '#f1edff', ink: '#211635', label: 'Midnight purple'},
  forest: {accent: '#267957', soft: '#eef6e9', ink: '#142b22', label: 'Fresh green'}
};
let logoData = '';
let logoReady = Promise.resolve();
let logoSequence = 0;
let currentKit = null;
let busy = false;
let runSequence = 0;
let posterObjectUrl = '';
let pageObjectUrl = '';
let lastOpener = null;
let toastTimer;
const objectUrls = new Set();

function toast(message) {
  const node = $('#toast');
  clearTimeout(toastTimer);
  node.textContent = message;
  node.classList.add('show');
  toastTimer = setTimeout(() => node.classList.remove('show'), 3600);
}
function openStudio(event) {
  lastOpener = event.currentTarget;
  if (!studio.open) studio.showModal();
  studio.scrollTop = 0;
  document.body.classList.add('modal-open');
  $('#project-name').focus();
}
function cancelRun() {
  runSequence++;
  busy = false;
  $('.form-submit').disabled = false;
  $('#use-example').disabled = false;
  form.removeAttribute('aria-busy');
  if (!currentKit) {
    $('#output-status').textContent = 'AWAITING BRIEF';
    $$('.progress-list li').forEach(node => {node.className = ''; $('i', node).textContent = '\u25cb';});
  } else {
    $('#output-status').textContent = 'LAUNCH KIT READY';
    $$('.progress-list li').forEach(node => {node.className = 'done'; $('i', node).textContent = '\u2713';});
  }
}
$$('[data-open-studio]').forEach(button => button.addEventListener('click', openStudio));
$('#close-studio').addEventListener('click', () => studio.close());
studio.addEventListener('close', () => {
  cancelRun();
  document.body.classList.remove('modal-open');
  lastOpener?.focus();
});
studio.addEventListener('click', event => {
  const rect = studio.getBoundingClientRect();
  if (event.target === studio && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) studio.close();
});
const menuButton = $('.mobile-menu');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  $('#main-nav').classList.toggle('open', open);
});
$$('#main-nav a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  $('#main-nav').classList.remove('open');
}));
$('#year').textContent = new Date().getFullYear();

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}
function safeURL(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function readBrief() {
  return {
    name: $('#project-name').value.trim(),
    description: $('#project-description').value.trim(),
    audience: $('#project-audience').value.trim(),
    style: $('#project-style').value,
    url: safeURL($('#project-url').value.trim()),
    logo: logoData
  };
}
try {
  const brief = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (brief && typeof brief === 'object') {
    for (const [key, id, limit] of [['name', 'project-name', 36], ['description', 'project-description', 500], ['audience', 'project-audience', 90]]) {
      if (typeof brief[key] === 'string') $('#' + id).value = brief[key].slice(0, limit);
    }
    if (palettes[brief.style]) $('#project-style').value = brief.style;
    $('#project-url').value = safeURL(brief.url);
  }
} catch { /* The demo works when browser storage is unavailable. */ }

$('#project-logo').addEventListener('change', () => {
  const sequence = ++logoSequence;
  logoData = '';
  const input = $('#project-logo');
  const file = input.files[0];
  const status = $('#file-status');
  if (!file) {status.textContent = 'Your logo stays in this browser tab.'; logoReady = Promise.resolve(); return;}
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    input.value = '';
    status.textContent = 'Choose a PNG, JPG, or WebP image under 3 MB.';
    toast('Please use a PNG, JPG, or WebP image under 3 MB.');
    logoReady = Promise.resolve();
    return;
  }
  status.textContent = 'Checking your logo\u2026';
  logoReady = new Promise(resolve => {
    const reader = new FileReader();
    const fail = () => {
      if (sequence === logoSequence) {input.value = ''; status.textContent = 'This image could not be read. Please choose another.';}
      resolve();
    };
    reader.onerror = fail;
    reader.onload = () => {
      const image = new Image();
      image.onerror = fail;
      image.onload = () => {
        if (sequence === logoSequence) {
          if (image.naturalWidth > 8192 || image.naturalHeight > 8192) {fail(); return;}
          logoData = String(reader.result);
          status.textContent = file.name + ' \u00b7 Ready. Stays on your device.';
        }
        resolve();
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
});
$('#project-url').addEventListener('input', () => $('#project-url').setCustomValidity(''));
$('#use-example').addEventListener('click', () => {
  $('#project-name').value = 'UNTILO';
  $('#project-description').value = 'A focused launch workspace that brings your project to life with a landing page, launch copy, and release visuals.';
  $('#project-audience').value = 'independent builders and new project teams';
  $('#project-style').value = 'electric';
  $('#project-url').value = 'https://ghostxrun.github.io/UNTILO/';
  $('#project-url').setCustomValidity('');
  form.requestSubmit();
});

function makeLanding(brief, palette) {
  const n = escapeHTML(brief.name), d = escapeHTML(brief.description), a = escapeHTML(brief.audience);
  const mark = brief.logo ? `<img src="${escapeHTML(brief.logo)}" alt="${n} logo">` : `<span class="mark">${escapeHTML(Array.from(brief.name)[0].toUpperCase())}</span>`;
  const destination = brief.url ? escapeHTML(brief.url) : '#about';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${d}"><title>${n} \u2014 Meet what\u2019s next.</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;font-family:Arial,sans-serif;color:${palette.ink}}a{color:inherit;text-decoration:none}header,main,footer{max-width:1100px;margin:auto}header{padding:25px 6%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8ebf1;font-size:12px}.brand{display:flex;align-items:center;gap:9px;font-size:18px;font-weight:700;letter-spacing:-.6px}.brand img,.mark{width:32px;height:32px;object-fit:cover;border-radius:8px}.mark{display:grid;place-items:center;background:${palette.accent};color:white}header nav{display:flex;gap:22px}.hero{padding:85px 6% 70px;position:relative;overflow:hidden}.eyebrow{font-size:9px;letter-spacing:2px;color:${palette.accent};font-weight:700}h1{font-size:clamp(43px,8vw,94px);line-height:1.02;letter-spacing:-.06em;max-width:850px;margin:28px 0;overflow-wrap:anywhere}h1 span{color:${palette.accent}}.intro{max-width:590px;color:#687182;line-height:1.8;font-size:16px;overflow-wrap:anywhere}.cta{display:inline-block;margin-top:25px;background:${palette.accent};color:white;padding:16px 22px;border-radius:6px;font-size:12px}.audience{padding:40px 6%;background:${palette.soft};border-top:1px solid #e8ebf1}.audience h2{font-size:28px;line-height:1.3;letter-spacing:-1px;max-width:700px;overflow-wrap:anywhere}.audience p{font-size:14px;line-height:1.7;color:#687182;max-width:650px;overflow-wrap:anywhere}.values{display:grid;grid-template-columns:repeat(3,1fr);padding:38px 6%;gap:30px}.values span{font-size:10px;color:${palette.accent}}.values h3{font-size:16px;letter-spacing:-.4px}.values p{font-size:12px;line-height:1.7;color:#687182}footer{padding:25px 6%;border-top:1px solid #e8ebf1;display:flex;gap:20px;justify-content:space-between;font-size:9px;color:#8e98aa}.review{padding:12px 6%;font-size:9px;color:#8e98aa;border-top:1px solid #e8ebf1;margin:0 auto;max-width:1100px}@media(max-width:560px){header{padding:18px 6%}header nav{gap:13px;font-size:10px}.brand{font-size:15px}.hero{padding:50px 6%}.intro{font-size:14px}.values{grid-template-columns:1fr;gap:15px}.audience h2{font-size:24px}footer{flex-wrap:wrap}.eyebrow{font-size:8px}}
</style></head><body><header><a class="brand" href="#">${mark}${n}</a><nav><a href="#about">About</a><a href="${destination}">${brief.url ? 'Explore' : 'Learn more'} \u2197</a></nav></header><main><section class="hero"><p class="eyebrow">A NEW IDEA. A NEW CHAPTER.</p><h1>Meet <span>${n}.</span><br>Meet what\u2019s next.</h1><p class="intro">${d}</p><a class="cta" href="${destination}">${brief.url ? 'Explore ' + n : 'Discover the idea'} \u2197</a></section><section class="audience" id="about"><p class="eyebrow">BUILT WITH YOU IN MIND</p><h2>A fresh starting point for ${a}.</h2><p>${d}</p></section><section class="values"><article><span>01 / THE IDEA</span><h3>A clear direction.</h3><p>Explore the project, understand the vision, and see where it\u2019s headed.</p></article><article><span>02 / THE PEOPLE</span><h3>Made for your next chapter.</h3><p>A project shaped around the people it hopes to serve.</p></article><article><span>03 / THE START</span><h3>Follow what comes next.</h3><p>This is the beginning. Visit the project for the latest updates.</p></article></section></main><footer><strong>${n}</strong><span>A new chapter starts here.</span><span>Created with UNTILO</span></footer><p class="review">Review your copy and links before publishing.</p></body></html>`;
}
function wrapWords(value, maxChars, maxLines) {
  const words = value.trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length <= maxChars) { line = (line + ' ' + word).trim(); }
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const result = lines.slice(0, maxLines).map(text => text.length > maxChars ? text.slice(0, maxChars - 1) + '\u2026' : text);
  if (lines.length > maxLines) result[maxLines - 1] = result[maxLines - 1].slice(0, maxChars - 1) + '\u2026';
  return result;
}
function makeVisual(brief, palette, cover = false) {
  const w = cover ? 1200 : 1080, h = cover ? 630 : 1080;
  const lines = wrapWords(brief.name, cover ? 22 : 18, 2);
  const titleSize = cover ? 76 : 100;
  const titleY = cover ? 291 : 535;
  const mark = brief.logo ? `<image href="${escapeHTML(brief.logo)}" x="65" y="56" width="65" height="65" preserveAspectRatio="xMidYMid meet"/>` : `<rect x="65" y="56" width="65" height="65" rx="16" fill="white" fill-opacity=".15"/><text x="98" y="102" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="37" font-weight="700">${escapeHTML(Array.from(brief.name)[0].toUpperCase())}</text>`;
  const tagline = wrapWords(brief.description, cover ? 88 : 58, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${palette.accent}"/><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" opacity=".15"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#grid)"/><circle cx="${w - 120}" cy="${cover ? 190 : 240}" r="${cover ? 170 : 240}" fill="none" stroke="white" stroke-opacity=".15" stroke-width="45"/><path d="M${w - 240} ${cover ? 310 : 360}l200 -200m-160 0h160v160" stroke="white" stroke-opacity=".85" stroke-width="23" fill="none"/>${mark}<text x="65" y="${cover ? 192 : 425}" fill="white" opacity=".7" font-family="Arial,sans-serif" font-size="15" letter-spacing="4">YOUR NEXT CHAPTER STARTS HERE.</text><text fill="white" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="-4">${lines.map((line, index) => `<tspan x="60" y="${titleY + index * titleSize * 1.08}">${escapeHTML(line)}</tspan>`).join('')}</text><text fill="white" opacity=".8" font-family="Arial,sans-serif" font-size="${cover ? 19 : 23}">${tagline.map((line, index) => `<tspan x="65" y="${titleY + lines.length * titleSize * 1.08 + 20 + index * 34}">${escapeHTML(line)}</tspan>`).join('')}</text><path d="M65 ${h - 100}H${w - 65}" stroke="white" stroke-opacity=".3"/><text x="65" y="${h - 58}" fill="white" font-family="Arial,sans-serif" font-size="14" letter-spacing="2">MEET WHAT\u2019S NEXT.</text><text x="${w - 65}" y="${h - 58}" text-anchor="end" fill="white" opacity=".65" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">CREATED WITH UNTILO \u2197</text></svg>`;
}
function makeKit(brief) {
  const palette = palettes[brief.style] || palettes.electric;
  const shortDescription = brief.description.length > 150 ? brief.description.slice(0, 147).trim() + '\u2026' : brief.description;
  const post = `Meet ${brief.name}.\n\n${shortDescription}\n\n${brief.url ? 'Explore: ' + brief.url : 'Follow along for what comes next.'}`;
  const thread = `1/ Introducing ${brief.name}.\n${brief.description}\n\n2/ Built for ${brief.audience}.\nA new idea starts with understanding who it\u2019s for. That\u2019s where our story begins.\n\n3/ This is our starting point.\n${brief.url ? 'Take a look: ' + brief.url : 'Stay close for project updates and the next chapter.'}`;
  return {brief, html: makeLanding(brief, palette), post, thread, poster: makeVisual(brief, palette), cover: makeVisual(brief, palette, true)};
}
function setTab(name, focus = false) {
  $$('.output-tabs [role=tab]').forEach(tab => {
    const selected = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $('#panel-' + tab.dataset.tab).hidden = !selected;
    if (selected && focus) tab.focus();
  });
}
$$('.output-tabs [role=tab]').forEach(tab => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = $$('.output-tabs [role=tab]');
    let index = tabs.indexOf(tab);
    index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[index].dataset.tab, true);
  });
});
function renderKit(kit) {
  $('#page-preview').srcdoc = kit.html;
  if (pageObjectUrl) {URL.revokeObjectURL(pageObjectUrl); objectUrls.delete(pageObjectUrl);}
  pageObjectUrl = URL.createObjectURL(new Blob([kit.html], {type: 'text/html;charset=utf-8'}));
  objectUrls.add(pageObjectUrl);
  $('#open-full-page').href = pageObjectUrl;
  $('#edit-post').value = kit.post;
  $('#edit-thread').value = kit.thread;
  updatePostLength();
  $('#copy-preview').textContent = `LAUNCH POST\n\n${kit.post}\n\n\u2014\u2014\u2014\n\nINTRODUCTION THREAD\n\n${kit.thread}\n\nDraft copy: review before posting. X character limits depend on your account; edit or split longer drafts.`;
  if (posterObjectUrl) {URL.revokeObjectURL(posterObjectUrl); objectUrls.delete(posterObjectUrl);}
  posterObjectUrl = URL.createObjectURL(new Blob([kit.poster], {type: 'image/svg+xml'}));
  objectUrls.add(posterObjectUrl);
  $('#poster-preview').src = posterObjectUrl;
  $('#poster-preview').alt = kit.brief.name + ' launch poster';
  $('#output-empty').hidden = true;
  $('#output-results').hidden = false;
  $('#output-status').textContent = 'LAUNCH KIT READY';
  setTab('page');
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  for (const id of ['project-name', 'project-description', 'project-audience']) {
    const input = $('#' + id);
    input.value = input.value.trim();
    if (!input.value) {input.reportValidity(); return;}
  }
  const urlInput = $('#project-url');
  if (urlInput.value.trim() && !safeURL(urlInput.value.trim())) {
    urlInput.setCustomValidity('Please use a valid HTTPS link without embedded credentials.');
    urlInput.reportValidity();
    return;
  }
  busy = true;
  const run = ++runSequence;
  $('.form-submit').disabled = true;
  $('#use-example').disabled = true;
  form.setAttribute('aria-busy', 'true');
  $('#studio-announcement').textContent = 'Preparing your project files from your brief.';
  try {
    await logoReady;
    if (run !== runSequence) return;
    const brief = readBrief();
    try { const {logo, ...saved} = brief; localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Optional browser storage. */ }
    $('#output-status').textContent = 'CREATING YOUR KIT';
    const steps = $$('.progress-list li');
    steps.forEach(node => {node.className = ''; $('i', node).textContent = '\u25cb';});
    for (const step of steps) {
      step.classList.add('active');
      await new Promise(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320));
      if (run !== runSequence) return;
      step.classList.remove('active'); step.classList.add('done'); $('i', step).textContent = '\u2713';
    }
    currentKit = makeKit(brief);
    renderKit(currentKit);
    $('#studio-announcement').textContent = 'Your launch kit is ready. Review your page, copy your post, or download your files.';
    if (window.matchMedia('(max-width:640px)').matches) $('.studio-output').scrollIntoView({block: 'start', behavior: 'smooth'});
  } catch {
    $('#studio-announcement').textContent = 'Your kit could not be prepared. Please try again.';
    $('#output-status').textContent = currentKit ? 'PREVIOUS KIT READY' : 'TRY AGAIN';
  } finally {
    if (run === runSequence) {
      busy = false; $('.form-submit').disabled = false; $('#use-example').disabled = false; form.removeAttribute('aria-busy');
    }
  }
});
$('#copy-post').addEventListener('click', async () => {
  if (!currentKit) return;
  try {
    await navigator.clipboard.writeText(currentKit.post);
    toast('Launch post copied. Review it before publishing.');
  } catch {
    $('#edit-post').focus();
    $('#edit-post').select();
    toast('The launch post is selected. Copy it manually.');
  }
});

// Small, uncompressed ZIP writer: keeps the demo buildless and downloads entirely local.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeZip(files) {
  const encoder = new TextEncoder();
  const locals = [], centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), data = file.data instanceof Uint8Array ? file.data : encoder.encode((file.name.endsWith('.txt') ? '\uFEFF' : '') + file.content), crc = crc32(data);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    locals.push(local, data); centrals.push(central); offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end], {type: 'application/zip'});
}
$('#download-kit').addEventListener('click', async () => {
  if (!currentKit || busy) {toast('Wait for your updated kit to finish.'); return;}
  const kit = currentKit;
  const button = $('#download-kit');
  button.disabled = true;
  const previousLabel = button.innerHTML;
  button.textContent = 'Preparing your files...';
  try {
  const images = await rasterAssets(kit);
  const files = [
    {name: 'index.html', content: kit.html},
    {name: 'launch-copy.txt', content: `UNTILO LAUNCH KIT \u2014 RELEASE COPY\n\nPROJECT: ${kit.brief.name}\n\nLAUNCH POST\n${kit.post}\n\nINTRODUCTION THREAD\n${kit.thread}\n\nReview all copy and links before publishing. Edit or split longer posts for your X account limits.`},
    {name: 'launch-poster.svg', content: kit.poster},
    {name: 'social-cover.svg', content: kit.cover},
    {name: 'launch-poster.png', data: new Uint8Array(await images.poster.arrayBuffer())},
    {name: 'social-cover.png', data: new Uint8Array(await images.cover.arrayBuffer())},
    {name: 'READ-ME.txt', content: 'Created with UNTILO Launch Studio.\n\n1. Open index.html in your browser to review your landing page.\n2. Upload index.html to a static hosting provider to publish it. Review wording and links first.\n3. Use launch-poster.png (1080 x 1080) and social-cover.png (1200 x 630) on your release channels. Editable SVG source files are also included.\n4. Your latest edited post and thread are in launch-copy.txt. Review post lengths and claims before publishing.\n\nYour files were prepared from browser-local layouts and copy structures. Live AI execution is not connected. No deployment or social posting has been performed.\n'}
  ];
  const slug = kit.brief.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'project';
  saveDownload(makeZip(files), slug + '-launch-kit.zip');
  toast('Your launch kit is ready to download.');
  } catch {
    toast('The images could not be exported. Please try downloading again.');
  } finally {
    button.disabled = false;
    button.innerHTML = previousLabel;
  }
});
window.addEventListener('pagehide', () => {objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear();});

const hasOfficialContract = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(UNTILO_CONTRACT_ADDRESS);
const contractCopyButton = $('#copy-contract');
if (hasOfficialContract && contractCopyButton) {
  $('#official-ca').textContent = UNTILO_CONTRACT_ADDRESS;
  $('#contract-status').textContent = 'Verify this full address before interacting.';
  $('#contract-network-status').textContent = 'ANNOUNCED';
  $('.ca-row strong').textContent = UNTILO_CONTRACT_ADDRESS;
  $('.ca-row strong').style.overflowWrap = 'anywhere';
  $('.ca-row strong').style.fontSize = '15px';
  $('.ca-row > span').textContent = 'SOLANA';
  $('.token-panel > p').textContent = 'Verify the official contract address above before interacting.';
  contractCopyButton.disabled = false;
  contractCopyButton.replaceChildren(document.createTextNode('COPY CA '));
  const icon = document.createElement('span'); icon.textContent = '\u2197'; icon.setAttribute('aria-hidden', 'true'); contractCopyButton.append(icon);
  contractCopyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(UNTILO_CONTRACT_ADDRESS);
      toast('Official contract address copied.');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange(); range.selectNodeContents($('#official-ca'));
      selection.removeAllRanges(); selection.addRange(range);
      toast('The address is selected. Copy it manually.');
    }
  });
}

const roleDescriptions = {
  coordinator: {name: 'PROJECT LEAD', description: 'Keeps the scope, project identity, and deliverables aligned from the first brief to the final handoff.'},
  strategy: {name: 'STRATEGIST', description: 'Turns the idea, audience, and desired outcome into a clear positioning statement and a focused page structure.'},
  copy: {name: 'COPYWRITER', description: 'Uses the project brief to shape the headline, introduction, call to action, launch post, and social thread.'},
  design: {name: 'DESIGNER', description: 'Carries the logo, palette, and visual direction into a coordinated page, launch poster, and social cover.'},
  build: {name: 'BUILDER', description: 'Brings the page, copy, and visuals together as a responsive HTML file and an organized downloadable release kit.'},
  owner: {name: 'PROJECT OWNER', description: 'Reviews the message, identity, links, and files. Final approval and the decision to publish stay with you.'}
};
const workflowStages = [
  {label: 'BRIEF', title: 'Give the work a destination.', description: 'Tell UNTILO what you are building, who it serves, and what the first release needs to communicate.', output: 'A shared project brief', role: 'coordinator', nodes: ['coordinator']},
  {label: 'PLAN', title: 'Define what must be delivered.', description: 'Translate the brief into a concrete scope: a landing page, launch copy, poster, and social cover. Keep the audience and visual direction consistent.', output: 'A focused delivery plan', role: 'strategy', nodes: ['coordinator', 'strategy']},
  {label: 'ASSEMBLE', title: 'Give every role a clear handoff.', description: 'Strategy sets the direction. Copy shapes the story. Design defines the look. Build brings the pieces together. Each role works from the same brief.', output: 'One coordinated workflow', role: 'coordinator', nodes: ['strategy', 'copy', 'design', 'build']},
  {label: 'CREATE', title: 'Turn the direction into assets.', description: 'Use your project details and selected palette to prepare page content, social copy, a launch poster, and a cover. Review the results together in the studio.', output: 'Page + copy + coordinated visuals', role: 'build', nodes: ['copy', 'design', 'build']},
  {label: 'REVIEW', title: 'Keep the final decision human.', description: 'Check the headline, audience fit, logo, links, and release copy. Update the brief and create a revised kit whenever the direction needs adjusting.', output: 'Owner-reviewed project files', role: 'owner', nodes: ['owner', 'coordinator']},
  {label: 'RELEASE', title: 'Finish with a complete handoff.', description: 'Download the files together. Publish the HTML to your hosting provider and use the copy and visuals on your own channels. The mission closes with the assets in your hands.', output: 'A portable launch kit', role: 'owner', nodes: ['build', 'owner']}
];
function showRole(role) {
  const detail = roleDescriptions[role];
  if (!detail) return;
  $$('.mission-node').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.role === role)));
  const container = $('#role-detail');
  container.replaceChildren();
  const label = document.createElement('span'); label.textContent = 'ROLE / ' + detail.name;
  const description = document.createElement('p'); description.textContent = detail.description;
  container.append(label, description);
}
function showStage(index) {
  const stage = workflowStages[index];
  if (!stage) return;
  const number = String(index + 1).padStart(2, '0');
  $('#mission-stage-label').textContent = number + ' / ' + stage.label;
  $$('.mission-steps button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === index)));
  const content = $('#stage-content');
  $('.stage-number', content).textContent = number + ' / ' + stage.label;
  $('h3', content).textContent = stage.title;
  $('p', content).textContent = stage.description;
  $('.detail-output', content).textContent = stage.output;
  $$('.mission-node').forEach(node => node.classList.toggle('stage-involved', stage.nodes.includes(node.dataset.role)));
  showRole(stage.role);
}
$$('.mission-node').forEach(node => node.addEventListener('click', () => showRole(node.dataset.role)));
$$('.mission-steps button').forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.stage))));
if ($('#stage-content')) showStage(0);

const sectionLinks = $$('[data-nav-section]');
function activateSection(id) {
  sectionLinks.forEach(link => {
    if (link.dataset.navSection === id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
sectionLinks.forEach(link => link.addEventListener('click', () => activateSection(link.dataset.navSection)));
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible.length) activateSection(visible[0].target.id);
  }, {rootMargin: '-75px 0px -45% 0px', threshold: [0, .1, .3]});
  sectionLinks.forEach(link => {const section = document.getElementById(link.dataset.navSection); if (section) sectionObserver.observe(section);});
}

function updatePostLength() {
  const length = Array.from($('#edit-post').value).length;
  $('#post-length').textContent = length + ' characters';
  $('#post-length').classList.toggle('over-length', length > 280);
}
$('#edit-post').addEventListener('input', () => {
  if (currentKit) currentKit.post = $('#edit-post').value;
  updatePostLength();
});
$('#edit-thread').addEventListener('input', () => {
  if (currentKit) currentKit.thread = $('#edit-thread').value;
});

let saveBriefTimer;
form.addEventListener('input', () => {
  clearTimeout(saveBriefTimer);
  $('#draft-status').textContent = 'Saving your brief...';
  saveBriefTimer = setTimeout(() => {
    try {
      const {logo, ...brief} = readBrief();
      localStorage.setItem(storageKey, JSON.stringify(brief));
      $('#draft-status').textContent = 'Brief saved on this device.';
    } catch {
      $('#draft-status').textContent = 'Browser storage is unavailable. Keep this tab open to retain your brief.';
    }
  }, 350);
});

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => {URL.revokeObjectURL(url); objectUrls.delete(url);}, 30000);
}
function rasterizeSVG(svg, width, height) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
    const image = new Image();
    const timeout = setTimeout(() => {cleanup(); reject(new Error('Image export timed out'));}, 15000);
    function cleanup() {clearTimeout(timeout); URL.revokeObjectURL(url);}
    image.onerror = () => {cleanup(); reject(new Error('Image could not be loaded'));};
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(blob => {
          cleanup();
          if (blob) resolve(blob); else reject(new Error('PNG export unavailable'));
        }, 'image/png');
      } catch (error) {cleanup(); reject(error);}
    };
    image.src = url;
  });
}
async function rasterAssets(kit) {
  if (!kit.rasterPromise) {
    kit.rasterPromise = Promise.all([rasterizeSVG(kit.poster, 1080, 1080), rasterizeSVG(kit.cover, 1200, 630)])
      .then(([poster, cover]) => ({poster, cover}))
      .catch(error => {kit.rasterPromise = null; throw error;});
  }
  return kit.rasterPromise;
}
for (const [id, key, filename] of [['download-poster', 'poster', 'launch-poster.png'], ['download-cover', 'cover', 'social-cover.png']]) {
  $('#' + id).addEventListener('click', async () => {
    if (!currentKit || busy) {toast('Finish creating your updated kit first.'); return;}
    const button = $('#' + id), kit = currentKit;
    button.disabled = true;
    try {
      const images = await rasterAssets(kit);
      saveDownload(images[key], filename);
      toast('PNG ready to download.');
    } catch { toast('This image could not be exported. Please try again.'); }
    finally {button.disabled = false;}
  });
}

// A local process playback: these counters describe the diagram, not live AI jobs.
const playback = {
  stage: 0, stageElapsed: 0, elapsed: 0, duration: 5600,
  paused: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  visible: false, lastFrame: 0, lastRender: 0, log: []
};
const stageActivities = [
  'Brief and audience brought into focus.',
  'Scope and delivery plan highlighted.',
  'Strategy, copy, design, and build connected.',
  'Page, story, and visual handoffs in focus.',
  'Owner review and approval path highlighted.',
  'Release files and final handoff in focus.'
];
const clockFormat = milliseconds => {
  const seconds = Math.floor(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
};
function recordWorkflowActivity(message) {
  playback.log.unshift({time: clockFormat(playback.elapsed), message});
  playback.log = playback.log.slice(0, 3);
  const list = $('#workflow-activity');
  list.replaceChildren();
  for (const item of playback.log) {
    const row = document.createElement('li'), time = document.createElement('time'), text = document.createElement('span');
    time.textContent = item.time; text.textContent = item.message;
    row.append(time, text); list.append(row);
  }
}
function renderPlayback() {
  const stage = workflowStages[playback.stage];
  const percent = Math.min(100, Math.floor(((playback.stage + playback.stageElapsed / playback.duration) / workflowStages.length) * 100));
  const stageCount = $('#workflow-stage-count');
  stageCount.replaceChildren(document.createTextNode(String(playback.stage + 1).padStart(2, '0') + ' '));
  const total = document.createElement('small'); total.textContent = '/ 06'; stageCount.append(total);
  const roleCount = $('#workflow-role-count');
  roleCount.replaceChildren(document.createTextNode(stage.nodes.length + ' '));
  const roleTotal = document.createElement('small'); roleTotal.textContent = '/ 6'; roleCount.append(roleTotal);
  $('#workflow-percent').textContent = percent + '%';
  $('#workflow-progress-fill').style.width = percent + '%';
  $('.workflow-progress').setAttribute('aria-valuenow', String(percent));
  const running = !playback.paused && playback.visible && !document.hidden;
  $('.mission-console').classList.toggle('is-playing', running);
  $$('.mission-node').forEach(node => {
    let state = $('.node-motion-state', node);
    if (!state) {state = document.createElement('em'); state.className = 'node-motion-state'; state.setAttribute('aria-hidden', 'true'); node.append(state);}
    state.textContent = stage.nodes.includes(node.dataset.role) ? 'IN FOCUS' : 'CONNECTED';
  });
}
function advancePlayback() {
  playback.stage = (playback.stage + 1) % workflowStages.length;
  playback.stageElapsed = 0;
  showStage(playback.stage);
  recordWorkflowActivity(stageActivities[playback.stage]);
}
function playbackFrame(now) {
  const delta = playback.lastFrame ? Math.min(250, now - playback.lastFrame) : 0;
  playback.lastFrame = now;
  if (!playback.paused && playback.visible && !document.hidden) {
    playback.elapsed += delta;
    playback.stageElapsed += delta;
    const hold = playback.stage === workflowStages.length - 1 ? 1000 : 0;
    if (playback.stageElapsed >= playback.duration + hold) advancePlayback();
  }
  if (!playback.paused && playback.visible && !document.hidden && now - playback.lastRender > 180) {renderPlayback(); playback.lastRender = now;}
  requestAnimationFrame(playbackFrame);
}
let inspectionResumeTimer;
function queuePlaybackResume() {
  clearTimeout(inspectionResumeTimer);
  inspectionResumeTimer = setTimeout(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playback.paused = false;
      renderPlayback();
    }
  }, 12000);
}
$$('.mission-steps button').forEach(button => button.addEventListener('click', () => {
  playback.stage = Number(button.dataset.stage);
  playback.stageElapsed = 0;
  playback.paused = true;
  recordWorkflowActivity('Inspecting stage ' + (playback.stage + 1) + ': ' + workflowStages[playback.stage].label.toLowerCase() + '.');
  queuePlaybackResume();
  renderPlayback();
}));
$$('.mission-node').forEach(node => node.addEventListener('click', () => {
  playback.paused = true;
  recordWorkflowActivity('Inspecting the ' + roleDescriptions[node.dataset.role].name.toLowerCase() + ' role.');
  queuePlaybackResume();
  renderPlayback();
}));
document.addEventListener('visibilitychange', renderPlayback);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  if (event.matches) {playback.paused = true; renderPlayback();}
});
if ('IntersectionObserver' in window) {
  const playbackObserver = new IntersectionObserver(entries => {
    playback.visible = entries[0].isIntersecting;
    renderPlayback();
  }, {threshold: 0.08});
  playbackObserver.observe($('.mission-console'));
} else playback.visible = true;
recordWorkflowActivity(stageActivities[0]);
renderPlayback();
requestAnimationFrame(playbackFrame);
