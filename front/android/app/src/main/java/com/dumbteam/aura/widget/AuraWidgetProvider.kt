package com.dumbteam.aura.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.dumbteam.aura.MainActivity
import com.dumbteam.aura.R

/**
 * 홈화면 widget — 다음 일정 한 줄 + 시간 + 장소.
 *
 * 데이터 소스: SharedPreferences("aura.widget"). RN 앱이 calendar agenda를 fetch하면
 * AuraWidgetModule(JS bridge)이 prefs에 다음 일정 JSON을 push → onUpdate가 prefs를 읽어
 * RemoteViews 갱신. backend 직접 호출 안 함 — RN-앱-실행이 prerequisite (앱 한 번은 켜야 함).
 *
 * onUpdate는 Android system이 30분마다 또는 widget 추가/재시작/명시적 update 시 호출.
 * RN 앱이 push한 후 즉시 보이려면 AuraWidgetModule.refreshAll(context) 호출.
 */
class AuraWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { id -> renderWidget(context, appWidgetManager, id) }
    }

    companion object {
        const val PREFS_NAME = "aura.widget"
        private const val KEY_TITLE = "next.title"
        private const val KEY_META = "next.meta"
        private const val KEY_LOCATION = "next.location"
        private const val KEY_EMPTY_MESSAGE = "next.emptyMessage"

        fun renderAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, AuraWidgetProvider::class.java)
            )
            ids.forEach { id -> renderWidget(context, manager, id) }
        }

        private fun renderWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val title = prefs.getString(KEY_TITLE, null)
            val meta = prefs.getString(KEY_META, null)
            val location = prefs.getString(KEY_LOCATION, null)
            val emptyMessage = prefs.getString(KEY_EMPTY_MESSAGE, "오늘 일정이 없어요.")

            val views = RemoteViews(context.packageName, R.layout.aura_widget)
            if (title.isNullOrBlank()) {
                views.setTextViewText(R.id.aura_widget_title, emptyMessage ?: "오늘 일정이 없어요.")
                views.setViewVisibility(R.id.aura_widget_meta, android.view.View.GONE)
                views.setViewVisibility(R.id.aura_widget_location, android.view.View.GONE)
            } else {
                views.setTextViewText(R.id.aura_widget_title, title)
                if (meta.isNullOrBlank()) {
                    views.setViewVisibility(R.id.aura_widget_meta, android.view.View.GONE)
                } else {
                    views.setTextViewText(R.id.aura_widget_meta, meta)
                    views.setViewVisibility(R.id.aura_widget_meta, android.view.View.VISIBLE)
                }
                if (location.isNullOrBlank()) {
                    views.setViewVisibility(R.id.aura_widget_location, android.view.View.GONE)
                } else {
                    views.setTextViewText(R.id.aura_widget_location, location)
                    views.setViewVisibility(R.id.aura_widget_location, android.view.View.VISIBLE)
                }
            }

            // 위젯 탭 → MainActivity launch.
            val intent = Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val pending = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.aura_widget_root, pending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
