'use strict';

// Explicit wallet selection; never request a transaction or signature.
const walletCatalog = {
  robinhood: {name: 'Robinhood Wallet', website: 'https://robinhood.com/web3-wallet/'} ,
  phantom: {name: 'Phantom', website: 'https://phantom.com/', browse: 'https://phantom.com/ul/browse/'}
};
const walletDialog = document.querySelector('#wallet-dialog');
const walletTrigger = document.querySelector('#connect-wallet');
let walletSession = null;
let walletPending = false;
let walletListenerCleanups = [];

const discoveredWallets = new Map();
window.addEventListener('eip6963:announceProvider', event => {
  const detail = event.detail;
  if (detail?.info?.rdns && typeof detail.provider?.request === 'function') {
    discoveredWallets.set(detail.info.rdns, detail.provider);
    if (walletDialog.open) renderWallet();
  }
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
function getEthereumProvider(id) {
  const announced = [...discoveredWallets].find(([rdns]) =>
    id === 'phantom' ? /(^|\\.)phantom\\.app$/.test(rdns) : /(^|\\.)robinhood\\.com$/.test(rdns));
  const injected = window.ethereum?.providers || [window.ethereum];
  const candidates = id === 'phantom'
    ? [announced?.[1], window.phantom?.ethereum, ...injected.filter(p => p?.isPhantom)]
    : [announced?.[1], window.robinhood?.ethereum, ...injected.filter(p => p?.isRobinhood)];
  // Robinhood's in-app browser exposes its selected EIP-1193 provider.
  if (id === 'robinhood' && /Robinhood/i.test(navigator.userAgent)) candidates.push(window.ethereum);
  return candidates.find(provider => provider && typeof provider.request === 'function') || null;
}
function validWalletAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value) ? value : '';
}
function clearWalletListeners() {
  for (const cleanup of walletListenerCleanups) {try {cleanup();} catch {}}
  walletListenerCleanups = [];
}
function renderWallet() {
  walletTrigger.classList.toggle('is-connected', Boolean(walletSession));
  walletTrigger.textContent = walletSession ? walletSession.address.slice(0, 4) + '...' + walletSession.address.slice(-4) : 'CONNECT WALLET';
  walletTrigger.title = walletSession ? 'Open ' + walletSession.name + ' wallet details' : 'Connect Robinhood Wallet or Phantom';
  document.querySelector('#wallet-account').hidden = !walletSession;
  document.querySelector('#wallet-choices').hidden = Boolean(walletSession);
  if (walletSession) {
    document.querySelector('#wallet-account-name').textContent = walletSession.name.toUpperCase();
    document.querySelector('#wallet-full-address').textContent = walletSession.address;
    document.querySelector('#wallet-explorer').href = 'https://etherscan.io/address/' + encodeURIComponent(walletSession.address);
    document.querySelector('#wallet-help').hidden = true;
  }
  document.querySelectorAll('[data-wallet]').forEach(button => {
    const installed = Boolean(getEthereumProvider(button.dataset.wallet));
    button.classList.toggle('installed', installed);
    button.disabled = walletPending;
    document.querySelector('[data-wallet-status=' + button.dataset.wallet + ']').textContent = installed ? 'Detected - connect on Ethereum' : 'Not detected on this browser';
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
  if (!walletPending) setWalletStatus(walletSession ? 'Your Ethereum wallet is connected.' : 'Select a wallet to continue.');
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
  document.querySelector('#wallet-help-text').textContent = 'Open this site in the wallet web3 browser with Ethereum selected, or install a compatible extension and refresh.';
  const install = document.querySelector('#wallet-install');
  install.href = wallet.website; install.textContent = 'Get ' + wallet.name + ' \u2197';
  const open = document.querySelector('#wallet-open-mobile');
  const currentPage = new URL(window.location.href);
  currentPage.hash = '';
  open.hidden = !wallet.browse;
  if (wallet.browse) open.href = wallet.browse + encodeURIComponent(currentPage.href) + '?ref=' + encodeURIComponent(window.location.origin);
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
  const provider = getEthereumProvider(id);
  if (!provider) {showWalletHelp(id); return;}
  const name = walletCatalog[id].name;
  walletPending = true;
  document.querySelector('#wallet-help').hidden = true;
  renderWallet();
  setWalletStatus('Approve the connection in ' + name + '.');
  try {
    const response = await provider.request({method: 'eth_requestAccounts'});
    const chainId = await provider.request({method: 'eth_chainId'});
    if (String(chainId).toLowerCase() !== '0x1') {setWalletStatus('Select Ethereum Mainnet in ' + name + ' and try again.'); return;}
    const address = validWalletAddress(response?.[0]);
    if (!address) throw new Error('No valid Ethereum address returned');
    clearWalletListeners();
    walletSession = {id, name, provider, address};
    listenToWallet(provider, 'accountsChanged', value => {
      if (walletSession?.provider !== provider) return;
      const address = validWalletAddress(value?.[0]);
      if (!address) {resetWalletSession('Wallet disconnected. Select a wallet to reconnect.'); return;}
      walletSession.address = address;
      renderWallet(); setWalletStatus('Connected account updated.');
    });
    listenToWallet(provider, 'disconnect', () => {
      if (walletSession?.provider === provider) resetWalletSession('Wallet disconnected. Select a wallet to reconnect.');
    });
    listenToWallet(provider, 'chainChanged', chainId => {
      if (walletSession?.provider === provider && String(chainId).toLowerCase() !== '0x1') resetWalletSession('Network changed. Select Ethereum Mainnet and reconnect.');
    });
    renderWallet();
    setWalletStatus(name + ' connected on Ethereum.');
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
    // Clear this site's session; wallet permissions remain managed inside the wallet.
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
