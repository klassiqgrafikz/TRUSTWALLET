const MAINTENANCE_KEY = 'tw_maintenance';
const MAINTENANCE_CONFIG_KEY = 'maintenance';
const MAINTENANCE_POLL_MS = 5000;
const MAINTENANCE_FAVICON_ON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#FBBF24"/><path d="M32 6a22 22 0 0 0-7 43v11h14V49a22 22 0 0 0-7-43z" fill="#1F2937"/><circle cx="49" cy="15" r="8.5" fill="#EF4444"/><path d="M49 12v6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="49" cy="21.5" r="1.8" fill="#fff"/></svg>');
const MAINTENANCE_FAVICON_OFF = 'https://trustwallet.com/icon.svg';
const MAINTENANCE_TITLE_ON = 'Site under development - Trust Wallet';
const MAINTENANCE_TITLE_OFF = 'Trust Wallet - Best Crypto Wallet for Web3, NFTs and DeFi';

var _maintenanceTimer = null;

function getMaintenanceCached() {
  try { return localStorage.getItem(MAINTENANCE_KEY) === 'on'; } catch (e) { return false; }
}

function setMaintenanceCached(on) {
  try { localStorage.setItem(MAINTENANCE_KEY, on ? 'on' : 'off'); } catch (e) {}
}

async function fetchMaintenanceFlag() {
  try {
    var v = await sbGetConfig(MAINTENANCE_CONFIG_KEY);
    if (v === 'on' || v === 'off') setMaintenanceCached(v === 'on');
    return v === 'on';
  } catch (e) {
    return getMaintenanceCached();
  }
}

function _setMaintenanceFavicon(on) {
  var link = document.getElementById('favicon');
  if (!link) return;
  link.href = on ? MAINTENANCE_FAVICON_ON : MAINTENANCE_FAVICON_OFF;
  link.type = 'image/svg+xml';
}

function applyMaintenance(on) {
  var overlay = document.getElementById('maintenanceOverlay');
  if (on) {
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('maintenance-block');
    _setMaintenanceFavicon(true);
    document.title = MAINTENANCE_TITLE_ON;
  } else {
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('maintenance-block');
    _setMaintenanceFavicon(false);
    document.title = MAINTENANCE_TITLE_OFF;
  }
}

async function _maintenanceCheckLoop() {
  var on = await fetchMaintenanceFlag();
  applyMaintenance(on);
}

function maintenanceInit() {
  applyMaintenance(getMaintenanceCached());
  _maintenanceCheckLoop();
  _maintenanceTimer = setInterval(_maintenanceCheckLoop, MAINTENANCE_POLL_MS);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) _maintenanceCheckLoop();
  });
  window.addEventListener('focus', function () { _maintenanceCheckLoop(); });
}