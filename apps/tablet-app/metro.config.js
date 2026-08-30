const { getDefaultConfig } = require("expo/metro-config");
const os = require("os");

const config = getDefaultConfig(__dirname);

// Auto-detect the local WiFi IP so the QR code always points to the right address.
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 interfaces
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
