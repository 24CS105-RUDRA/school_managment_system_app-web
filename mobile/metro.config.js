const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Use Babel instead of Hermes parser to support `match` syntax
// used by react-native 0.81.x
config.transformer.assetPlugins = []
config.transformer.minifierConfig = { mangle: false }

module.exports = config
