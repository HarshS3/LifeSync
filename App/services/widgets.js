import { NativeModules, Platform } from 'react-native';

const { LifeSyncWidget } = NativeModules;

export async function syncTodayDashboardWidget(summary) {
  if (Platform.OS !== 'android' || !LifeSyncWidget?.updateTodayDashboard) {
    return false;
  }

  try {
    await LifeSyncWidget.updateTodayDashboard(summary);
    return true;
  } catch (error) {
    console.warn('Failed to sync Today widget', error);
    return false;
  }
}
