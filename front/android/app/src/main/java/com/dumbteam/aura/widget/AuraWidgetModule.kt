package com.dumbteam.aura.widget

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * RN ↔ Android Widget bridge. RN이 calendar agenda fetch 후 setNextEvent를 호출하면
 * SharedPreferences("aura.widget")에 저장 + 모든 mount된 widget instance를 즉시 갱신.
 *
 * 위젯 자체는 backend를 직접 호출 안 함 — RN 앱이 한 번이라도 calendar fetch한 후에
 * widget이 의미있게 표시. 이는 RN-Widget 표준 패턴 (App Group/SharedPreferences로 데이터 공유).
 */
class AuraWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AuraWidget"

    @ReactMethod
    fun setNextEvent(payload: ReadableMap, promise: Promise) {
        try {
            val prefs = reactContext
                .getSharedPreferences(AuraWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit()
            editor.putString("next.title", optString(payload, "title"))
            editor.putString("next.meta", optString(payload, "meta"))
            editor.putString("next.location", optString(payload, "location"))
            editor.putString("next.emptyMessage", optString(payload, "emptyMessage"))
            editor.apply()
            AuraWidgetProvider.renderAll(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WIDGET_SET_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun clearNextEvent(promise: Promise) {
        try {
            reactContext
                .getSharedPreferences(AuraWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit().clear().apply()
            AuraWidgetProvider.renderAll(reactContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WIDGET_CLEAR_FAILED", e.message, e)
        }
    }

    private fun optString(map: ReadableMap, key: String): String? {
        return if (map.hasKey(key) && !map.isNull(key)) map.getString(key) else null
    }
}
