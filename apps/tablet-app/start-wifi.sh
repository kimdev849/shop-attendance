#!/bin/bash
# Force Expo Metro Bundler to advertise the LAN IP so phones can connect over WiFi
export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.100.116
cd "$(dirname "$0")"
npx expo start --clear
