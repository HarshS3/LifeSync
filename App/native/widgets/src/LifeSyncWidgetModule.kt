package com.harshs3.lifesync

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import android.content.ComponentName

class LifeSyncWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LifeSyncWidget"
    }

    @ReactMethod
    fun updateDashboard(data: ReadableMap) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("LifeSyncWidgetPrefs", Context.MODE_PRIVATE)
        val editor = prefs.edit()

        // Extract and Save Data
        if (data.hasKey("readiness")) {
            editor.putString("readiness_score", data.getInt("readiness").toString())
        }
        if (data.hasKey("calories")) {
            val current = data.getInt("calories")
            val target = data.getInt("calorieTarget")
            editor.putString("calories_str", "$current / $target kcal")
            
            val progress = if (target > 0) (current * 100) / target else 0
            editor.putInt("calorie_progress", progress)
        }
        if (data.hasKey("protein")) {
            editor.putString("protein_str", "P: ${data.getInt("protein")}g")
        }
        if (data.hasKey("insight")) {
            editor.putString("coach_insight", data.getString("insight"))
        }

        editor.apply()

        // Trigger widget update
        val intent = Intent(context, DashboardWidgetProvider::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, DashboardWidgetProvider::class.java))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
