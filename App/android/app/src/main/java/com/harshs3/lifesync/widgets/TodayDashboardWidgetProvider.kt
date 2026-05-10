package com.harshs3.lifesync.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import com.harshs3.lifesync.R

class TodayDashboardWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      appWidgetManager.updateAppWidget(appWidgetId, buildViews(context))
    }
  }

  companion object {
    private const val PREFS_NAME = "lifesync_widget_state"

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, TodayDashboardWidgetProvider::class.java)
      manager.updateAppWidget(component, buildViews(context))
    }

    private fun buildViews(context: Context): RemoteViews {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val calories = prefs.getString("calories", "--") ?: "--"
      val calorieTarget = prefs.getString("calorieTarget", "2000") ?: "2000"
      val protein = prefs.getString("protein", "--") ?: "--"
      val proteinTarget = prefs.getString("proteinTarget", "150") ?: "150"
      val readiness = prefs.getString("readiness", "--") ?: "--"
      val workout = prefs.getString("workout", "Not started") ?: "Not started"
      val updatedAt = prefs.getString("updatedAt", "Open LifeSync to sync") ?: "Open LifeSync to sync"

      return RemoteViews(context.packageName, R.layout.widget_today_dashboard).apply {
        setTextViewText(R.id.widgetCalories, calories)
        setTextViewText(R.id.widgetCalorieTarget, "/ $calorieTarget kcal")
        setTextViewText(R.id.widgetProtein, "${protein}g")
        setTextViewText(R.id.widgetProteinTarget, "/ ${proteinTarget}g")
        setTextViewText(R.id.widgetReadiness, readiness)
        setTextViewText(R.id.widgetWorkout, workout)
        setTextViewText(R.id.widgetUpdatedAt, updatedAt)

        setOnClickPendingIntent(R.id.widgetDashboardRoot, WidgetIntents.openApp(context, "", 100))
        setOnClickPendingIntent(R.id.widgetDashboardLogMeal, WidgetIntents.openApp(context, "nutrition/search", 101))
        setOnClickPendingIntent(R.id.widgetDashboardWorkout, WidgetIntents.openApp(context, "training/active", 102))
        setOnClickPendingIntent(R.id.widgetDashboardChat, WidgetIntents.openApp(context, "chat?widgetAction=assistant", 103))
      }
    }
  }
}
