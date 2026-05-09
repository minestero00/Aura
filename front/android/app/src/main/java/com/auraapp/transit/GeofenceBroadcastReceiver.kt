package com.auraapp.transit

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.auraapp.MainActivity
import com.auraapp.R
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.google.android.gms.location.LocationServices

/**
 * Geofence ENTER 이벤트 수신 — 앱이 background/killed 상태여도 OS가 이 receiver를
 * 호출. notification 즉시 표시 + (앱 살아있으면) JS 이벤트 emit.
 */
class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return
        if (event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER) return
        val triggered = event.triggeringGeofences ?: return

        val prefs = context.getSharedPreferences(
            TransitGeofenceModule.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        TransitGeofenceModule.ensureNotificationChannel(context)

        val triggeredIds = mutableListOf<String>()
        for (geofence in triggered) {
            val id = geofence.requestId
            triggeredIds.add(id)

            val name = prefs.getString("$id.name", "") ?: ""
            val type = prefs.getString("$id.type", "transit-arrival") ?: "transit-arrival"

            val title = "AURA 도착 알림"
            val body = if (type == "destination") {
                if (name.isEmpty()) "목적지에 거의 도착했어요. 조심히 도착하셨나요?"
                else "${name}에 거의 도착했어요. 조심히 도착하셨나요?"
            } else {
                if (name.isEmpty()) "정류장 근처에 도착했습니다."
                else "${name} 근처에 도착했습니다."
            }

            val openAppIntent = Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val contentPending = PendingIntent.getActivity(
                context, id.hashCode(), openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notif = NotificationCompat.Builder(context, TransitGeofenceModule.NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentPending)
                .build()
            nm.notify(id.hashCode(), notif)

            // 앱이 살아있으면 JS 이벤트 emit (foreground UI advance 동기화)
            TransitGeofenceModule.instance?.emitEnter(id)
        }

        // 같은 region 재진입 방지 — 한 번 ENTER 후 제거. JS가 leg 진행 후 새
        // startMonitoring 호출하면 새 region set으로 교체.
        if (triggeredIds.isNotEmpty()) {
            LocationServices.getGeofencingClient(context).removeGeofences(triggeredIds)
        }
    }
}
