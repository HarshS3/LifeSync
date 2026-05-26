const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo Config Plugin to inject Native Android Widgets
 */
const withLifeSyncWidgets = (config) => {
  // 1. Register Receivers in AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.receiver) mainApplication.receiver = [];
    
    const receivers = [
      {
        name: 'com.harshs3.lifesync.QuickActionsWidgetProvider',
        label: 'LifeSync Shortcuts',
        resource: '@xml/quick_actions_info'
      },
      {
        name: 'com.harshs3.lifesync.DashboardWidgetProvider',
        label: 'LifeSync Today',
        resource: '@xml/dashboard_info'
      }
    ];

    receivers.forEach(target => {
      const exists = mainApplication.receiver.some(r => r.$['android:name'] === target.name);
      if (!exists) {
        mainApplication.receiver.push({
          '$': {
            'android:name': target.name,
            'android:exported': 'false',
            'android:label': target.label
          },
          'intent-filter': [
            { action: [{ '$': { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }
          ],
          'meta-data': [
            { '$': { 'android:name': 'android.appwidget.provider', 'android:resource': target.resource } }
          ]
        });
      }
    });

    return config;
  });

  // 2. Copy Native Files (Dangerous Mod)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      
      const resDir = path.join(androidRoot, 'app/src/main/res');
      const javaDir = path.join(androidRoot, 'app/src/main/java/com/harshs3/lifesync');
      const sourceDir = path.join(projectRoot, 'native/widgets');

      fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });

      // Layouts
      const layouts = ['quick_actions_layout.xml', 'dashboard_layout.xml'];
      layouts.forEach(file => fs.copyFileSync(path.join(sourceDir, 'res/layout', file), path.join(resDir, 'layout', file)));

      // XML Info
      const xmls = ['quick_actions_info.xml', 'dashboard_info.xml'];
      xmls.forEach(file => fs.copyFileSync(path.join(sourceDir, 'res/xml', file), path.join(resDir, 'xml', file)));

      // Kotlin Source
      const sources = [
        'QuickActionsWidgetProvider.kt', 
        'DashboardWidgetProvider.kt', 
        'LifeSyncWidgetModule.kt', 
        'LifeSyncWidgetPackage.kt'
      ];
      sources.forEach(file => fs.copyFileSync(path.join(sourceDir, 'src', file), path.join(javaDir, file)));

      return config;
    },
  ]);

  return config;
};

module.exports = withLifeSyncWidgets;
