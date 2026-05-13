const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Keep Metro focused on the app and the hoisted workspace dependencies.
config.watchFolders = [
  projectRoot,
  workspaceRoot,
];

// Resolve packages from the app first, then the root workspace install.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure we can find the modules even if they are heavily hoisted or in the root.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
