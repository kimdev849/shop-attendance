const { getDefaultConfig } = require("expo/metro-config");
const os = require("os");

const config = getDefaultConfig(__dirname);

// Auto-detect the local WiFi IP so the QR code always points to the right address.
// Skip virtual adapters (WSL, Hyper-V, Docker, VMware...) that phones cannot reach.
const VIRTUAL_ADAPTER = /vethernet|wsl|hyper|virtual|vmware|docker|loopback|tailscale|zerotier/i;
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (VIRTUAL_ADAPTER.test(name)) continue;
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 interfaces
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  // Fallback: accept any non-internal IPv4, even from a virtual adapter
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const localIp = getLocalIpAddress();
console.log(`\n  Detected local IP: ${localIp}\n`);

// Force Metro to advertise this IP so the QR code is correct
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = localIp;

module.exports = config;
