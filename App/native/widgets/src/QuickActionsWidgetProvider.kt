package com.harshs3.lifesync

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class QuickActionsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.quick_actions_layout)

        // Set up pending intents for deep links
        views.setOnClickPendingIntent(R.id.btn_ai, createDeepLinkIntent(context, "lifesync://chat"))
        views.setOnClickPendingIntent(R.id.btn_meal, createDeepLinkIntent(context, "lifesync://nutrition/search"))
        views.setOnClickPendingIntent(R.id.btn_weight, createDeepLinkIntent(context, "lifesync://nutrition"))
        views.setOnClickPendingIntent(R.id.btn_workout, createDeepLinkIntent(context, "lifesync://training/active"))

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun createDeepLinkIntent(context: Context, uriString: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        
        return PendingIntent.getActivity(
            context,
            uriString.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
