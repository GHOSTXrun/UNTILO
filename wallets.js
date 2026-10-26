'use strict';

// Explicit wallet selection; never request a transaction or signature.
const walletCatalog = {
  backpack: {name: 'Backpack', website: 'https://backpack.app/', browse: 'https://backpack.app/ul/v1/browse/'},
  phantom: {name: 'Phantom', website: 'https://phantom.com/', browse: 'https://phantom.com/ul/browse/'}
};
const walletDialog = document.querySelector('#wallet-dialog');
const walletTrigger = document.querySelector('#connect-wallet');
let walletSession = null;
let walletPending = false;
let walletListenerCleanups = [];

function getSolanaProvider(id) {
  const candidates = id === 'phantom'
    ? [window.phantom?.solana, window.solana?.isPhantom ? window.solana : null]
    : [window.backpack?.solana, window.backpack, window.solana?.isBackpack ? window.solana : null];
  return candidates.find(provider => provider && typeof provider.connect === 'function') || null;
}
function validWalletAddress(value) {
  const address = value ? String(value) : '';
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) ? address : '';
}
function clearWalletListeners() {
  for (const cleanup of walletListenerCleanups) {try {cleanup();} catch {}}
  walletListenerCleanups = [];
}
function renderWallet() {
  walletTrigger.classList.toggle('is-connected', Boolean(walletSession));
  walletTrigger.textContent = walletSession ? walletSession.address.slice(0, 4) + '...' + walletSession.address.slice(-4) : 'CONNECT WALLET';
  walletTrigger.title = walletSession ? 'Open ' + walletSession.name + ' wallet details' : 'Connect Backpack or Phantom';
  document.querySelector('#wallet-account').hidden = !walletSession;
  document.querySelector('#wallet-choices').hidden = Boolean(walletSession);
  if (walletSession) {
    document.querySelector('#wallet-account-name').textContent = walletSession.name.toUpperCase();
    document.querySelector('#wallet-full-address').textContent = walletSession.address;
    document.querySelector('#wallet-explorer').href = 'https://solscan.io/account/' + encodeURIComponent(walletSession.address);
    document.querySelector('#wallet-help').hidden = true;
  }
  document.querySelectorAll('[data-wallet]').forEach(button => {
    const installed = Boolean(getSolanaProvider(button.dataset.wallet));
    button.classList.toggle('installed', installed);
    button.disabled = walletPending;
    document.querySelector('[data-wallet-status=' + button.dataset.wallet + ']').textContent = installed ? 'Detected - connect on Solana' : 'Not detected on this browser';
  });
}
function setWalletStatus(message) {document.querySelector('#wallet-status').textContent = message;}
function resetWalletSession(message) {
  clearWalletListeners();
  walletSession = null;
  renderWallet();
  setWalletStatus(message || 'Select a wallet to continue.');
}
function openWalletDialog() {
  renderWallet();
  if (!walletPending) setWalletStatus(walletSession ? 'Your Solana wallet is connected.' : 'Select a wallet to continue.');
  if (!walletDialog.open) walletDialog.showModal();
  document.body.classList.add('modal-open');
}
walletTrigger.addEventListener('click', openWalletDialog);
document.querySelector('#close-wallet').addEventListener('click', () => walletDialog.close());
walletDialog.addEventListener('close', () => {
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('#studio')?.open));
  walletTrigger.focus();
});
walletDialog.addEventListener('click', event => {
  const rect = walletDialog.getBoundingClientRect();
  if (event.target === walletDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) walletDialog.close();
});
window.addEventListener('focus', () => {if (walletDialog.open) renderWallet();});

function showWalletHelp(id) {
  const wallet = walletCatalog[id];
  document.querySelector('#wallet-help').hidden = false;
  document.querySelector('#wallet-help-title').textContent = 'Connect with ' + wallet.name;
  document.querySelector('#wallet-help-text').textContent = 'Install the browser extension, then refresh this page. On mobile, open UNTILO in the wallet browser and connect there.';
  const install = document.querySelector('#wallet-install');
  install.href = wallet.website; install.textContent = 'Get ' + wallet.name + ' \u2197';
  const open = document.querySelector('#wallet-open-mobile');
  const currentPage = new URL(window.location.href);
  currentPage.hash = '';
  open.href = wallet.browse + encodeURIComponent(currentPage.href) + '?ref=' + encodeURIComponent(window.location.origin);
  open.textContent = 'Open in ' + wallet.name + ' \u2197';
  setWalletStatus(wallet.name + ' was not detected. Choose an option above to continue.');
}
function listenToWallet(provider, event, handler) {
  if (typeof provider.on !== 'function') return;
  provider.on(event, handler);
  walletListenerCleanups.push(() => {
    if (typeof provider.removeListener === 'function') provider.removeListener(event, handler);
    else if (typeof provider.off === 'function') provider.off(event, handler);
  });
}
async function connectSelectedWallet(id) {
  if (walletPending || walletSession || !walletCatalog[id]) return;
  const provider = getSolanaProvider(id);
  if (!provider) {showWalletHelp(id); return;}
  const name = walletCatalog[id].name;
  walletPending = true;
  document.querySelector('#wallet-help').hidden = true;
  renderWallet();
  setWalletStatus('Approve the connection in ' + name + '.');
  try {
    const response = await provider.connect();
    const address = validWalletAddress(response?.publicKey || provider.publicKey);
    if (!address) throw new Error('No valid Solana address returned');
    clearWalletListeners();
    walletSession = {id, name, provider, address};
    listenToWallet(provider, 'accountChanged', value => {
      if (walletSession?.provider !== provider) return;
      const address = validWalletAddress(value);
      if (!address) {resetWalletSession('Wallet disconnected. Select a wallet to reconnect.'); return;}
      walletSession.address = address;
      renderWallet(); setWalletStatus('Connected account updated.');
    });
    listenToWallet(provider, 'disconnect', () => {
      if (walletSession?.provider === provider) resetWalletSession('Wallet disconnected. Select a wallet to reconnect.');
    });
    renderWallet();
    setWalletStatus(name + ' connected on Solana.');
    toast(name + ' connected.');
    if (walletDialog.open) walletDialog.close();
  } catch (error) {
    const cancelled = error?.code === 4001 || /reject|cancel|declin/i.test(error?.message || '');
    setWalletStatus(cancelled ? 'Connection cancelled. Choose a wallet when you are ready.' : 'Unable to connect. Unlock ' + name + ' and try again.');
  } finally {
    walletPending = false;
    renderWallet();
  }
}
document.querySelectorAll('[data-wallet]').forEach(button => button.addEventListener('click', () => connectSelectedWallet(button.dataset.wallet)));
document.querySelector('#wallet-disconnect').addEventListener('click', async () => {
  if (!walletSession || walletPending) return;
  const button = document.querySelector('#wallet-disconnect');
  button.disabled = true;
  walletPending = true;
  const provider = walletSession.provider;
  try {
    if (typeof provider.disconnect === 'function') await provider.disconnect();
    resetWalletSession('Wallet disconnected. Select a wallet to reconnect.');
    toast('Wallet disconnected.');
  } catch {setWalletStatus('Unable to disconnect. Please try again or disconnect in your wallet.');}
  finally {walletPending = false; button.disabled = false; renderWallet();}
});
document.querySelector('#wallet-copy-address').addEventListener('click', async () => {
  if (!walletSession) return;
  try {await navigator.clipboard.writeText(walletSession.address); toast('Wallet address copied.');}
  catch {
    const range = document.createRange(); range.selectNodeContents(document.querySelector('#wallet-full-address'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    setWalletStatus('The address is selected. Copy it manually.');
  }
});
renderWallet();
