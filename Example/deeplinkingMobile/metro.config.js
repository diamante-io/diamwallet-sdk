const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

let path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      // Point Metro to the local `react-native-diamwallet-sdk` package
      'diamwallet-sdk': path.resolve(__dirname, '../../'),
    },
  },
  watchFolders: [
    // Include the folder where the local SDK is located
    path.resolve(__dirname, '../../'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
