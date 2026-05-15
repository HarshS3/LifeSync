package com.harshs3.lifesync.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.harshs3.lifesync.R

class QuickLogWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      val views = RemoteViews(context.packageName, R.layout.widget_quick_log).apply {
        setOnClickPendingIntent(R.id.widgetQuickLogRoot, WidgetIntents.openApp(context, "chat?widgetAction=assistant", 200))
        setOnClickPendingIntent(R.id.widgetQuickLogChat, WidgetIntents.openApp(context, "chat?widgetAction=text", 201))
        setOnClickPendingIntent(R.id.widgetQuickLogVoice, WidgetIntents.openApp(context, "chat?widgetAction=voice", 202))
        setOnClickPendingIntent(R.id.widgetQuickLogMeal, WidgetIntents.openApp(context, "nutrition/search", 203))
        setOnClickPendingIntent(R.id.widgetQuickLogWorkout, WidgetIntents.openApp(context, "training/active", 204))
        setOnClickPendingIntent(R.id.widgetQuickLogWellness, WidgetIntents.openApp(context, "wellness/log", 205))
      }
      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}
