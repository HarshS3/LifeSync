package com.harshs3.lifesync.widgets

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LifeSyncWidgetModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "LifeSyncWidget"

  @ReactMethod
  fun updateTodayDashboard(summary: ReadableMap, promise: Promise) {
    try {
      val prefs = reactContext.getSharedPreferences("lifesync_widget_state", 0)
      val updatedAt = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())

      prefs.edit()
        .putString("calories", value(summary, "calories", "--"))
        .putString("calorieTarget", value(summary, "calorieTarget", "2000"))
        .putString("protein", value(summary, "protein", "--"))
        .putString("proteinTarget", value(summary, "proteinTarget", "150"))
        .putString("readiness", value(summary, "readiness", "--"))
        .putString("workout", value(summary, "workout", "Not started"))
        .putString("updatedAt", "Updated $updatedAt")
        .apply()

      TodayDashboardWidgetProvider.updateAll(reactContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("WIDGET_UPDATE_FAILED", error)
    }
  }

  private fun value(map: ReadableMap, key: String, fallback: String): String {
    if (!map.hasKey(key) || map.isNull(key)) return fallback
    return when (map.getType(key).name) {
      "Number" -> Math.round(map.getDouble(key)).toString()
      "String" -> map.getString(key) ?: fallback
      "Boolean" -> map.getBoolean(key).toString()
      else -> fallback
    }
  }
}
