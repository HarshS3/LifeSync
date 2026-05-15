package com.harshs3.lifesync.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.harshs3.lifesync.MainActivity

object WidgetIntents {
  fun openApp(context: Context, route: String, requestCode: Int): PendingIntent {
    val normalizedRoute = route.trimStart('/')
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("lifesync://$normalizedRoute")).apply {
      setClass(context, MainActivity::class.java)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
