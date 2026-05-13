const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Keep Metro focused on the app and the hoisted workspace dependencies.
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
];

// Resolve packages from the app first, then the root workspace install.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Avoid walking into unrelated workspace packages while resolving modules.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
