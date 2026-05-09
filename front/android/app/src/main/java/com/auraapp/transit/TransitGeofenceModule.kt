package com.auraapp.transit

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices

/**
 * Background-safe transit geofence module — iOS TransitGeofence.swift의 Android 미러.
 *
 * Google Play Services GeofencingClient를 사용. ENTER 이벤트는 OS가
 * GeofenceBroadcastReceiver를 호출(앱이 죽어있어도) → notification 표시 +
 * (앱 살아있으면) AuraTransitGeofenceEnter JS 이벤트 emit.
 *
 * region별 stop 이름/타입은 SharedPreferences에 영구 저장 — 앱 재시작 시
 * 알림 메시지에 정류장 이름 포함할 수 있게.
 */
class TransitGeofenceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val geofencingClient: GeofencingClient by lazy {
        LocationServices.getGeofencingClient(reactContext)
    }

    init {
        instance = this
        ensureNotificationChannel(reactContext)
    }

    override fun getName() = "TransitGeofence"

    @ReactMethod
    fun startMonitoring(regions: ReadableArray, promise: Promise) {
        try {
            val pendingIntent = buildPendingIntent(reactContext)
            // 기존 등록 모두 제거 (중복 방지)
            geofencingClient.removeGeofences(pendingIntent)

            val list = mutableListOf<Geofence>()
            val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit().clear()

            for (i in 0 until regions.size()) {
                val dict = regions.getMap(i) ?: continue
                val id = dict.getString("id") ?: continue
                if (!dict.hasKey("lat") || !dict.hasKey("lng")) continue
                val lat = dict.getDouble("lat")
                val lng = dict.getDouble("lng")
                val radius = if (dict.hasKey("radius")) dict.getDouble("radius").toFloat() else 200f
                val name = if (dict.hasKey("name")) dict.getString("name") ?: "" else ""
                val type = if (dict.hasKey("type")) dict.getString("type") ?: "transit-arrival" else "transit-arrival"

                list.add(
                    Geofence.Builder()
                        .setRequestId(id)
                        .setCircularRegion(lat, lng, radius)
                        .setExpirationDuration(Geofence.NEVER_EXPIRE)
                        .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                        .build()
                )
                editor.putString("$id.name", name)
                editor.putString("$id.type", type)
            }

            editor.apply()

            if (list.isEmpty()) {
                promise.resolve(Arguments.createMap().apply { putInt("added", 0) })
                return
            }

            val request = GeofencingRequest.Builder()
                .setInitialTrigger(0)
                .addGeofences(list)
                .build()

            geofencingClient.addGeofences(request, pendingIntent)
                .addOnSuccessListener {
                    promise.resolve(Arguments.createMap().apply { putInt("added", list.size) })
                }
                .addOnFailureListener { e ->
                    promise.reject("GEOFENCE_ADD_FAILED", e.message, e)
                }
        } catch (e: SecurityException) {
            promise.reject("GEOFENCE_PERMISSION_DENIED", e.message, e)
        } catch (e: Exception) {
            promise.reject("GEOFENCE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopMonitoring(promise: Promise) {
        try {
            val pendingIntent = buildPendingIntent(reactContext)
            geofencingClient.removeGeofences(pendingIntent)
                .addOnSuccessListener {
                    reactContext
                        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .edit().clear().apply()
                    promise.resolve(null)
                }
                .addOnFailureListener { e ->
                    promise.reject("GEOFENCE_REMOVE_FAILED", e.message, e)
                }
        } catch (e: Exception) {
            promise.reject("GEOFENCE_ERROR", e.message, e)
        }
    }

    // RN required (NativeEventEmitter).
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    /** BroadcastReceiver가 호출. 앱이 살아있으면 JS로 이벤트 emit. */
    fun emitEnter(id: String) {
        if (!reactContext.hasActiveReactInstance()) return
        val payload = Arguments.createMap().apply { putString("id", id) }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("AuraTransitGeofenceEnter", payload)
    }

    companion object {
        const val PREFS_NAME = "aura.transit.regionMetadata"
        const val NOTIFICATION_CHANNEL_ID = "aura.transit.arrival"
        const val INTENT_ACTION = "com.auraapp.transit.GEOFENCE_TRANSITION"

        @Volatile var instance: TransitGeofenceModule? = null
            private set

        fun buildPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
                .setAction(INTENT_ACTION)
            return PendingIntent.getBroadcast(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
        }

        fun ensureNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(NOTIFICATION_CHANNEL_ID) != null) return
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "AURA 도착 알림",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "정류장 도착 시 표시되는 알림"
                enableVibration(true)
            }
            nm.createNotificationChannel(channel)
        }
    }
}
