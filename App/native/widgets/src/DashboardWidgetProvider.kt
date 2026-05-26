package com.harshs3.lifesync

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class DashboardWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.dashboard_layout)

        // Load persisted data
        val prefs = context.getSharedPreferences("LifeSyncWidgetPrefs", Context.MODE_PRIVATE)
        val readiness = prefs.getString("readiness_score", "--")
        val calories = prefs.getString("calories_str", "-- / -- kcal")
        val progress = prefs.getInt("calorie_progress", 0)
        val protein = prefs.getString("protein_str", "P: --g")
        val insight = prefs.getString("coach_insight", "Sync to unlock today's coaching tip.")

        // Update UI
        views.setTextViewText(R.id.widget_readiness_val, readiness)
        views.setTextViewText(R.id.widget_calories, calories)
        views.setProgressBar(R.id.widget_progress, 100, progress, false)
        views.setTextViewText(R.id.widget_protein, protein)
        views.setTextViewText(R.id.widget_insight, insight)

        // Deep link to app
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("lifesync://home"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_readiness_val, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
