package com.dumbteam.aura.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * AURA 알림 채널을 일괄 등록. 앱 부팅 시 1회 호출 (MainApplication.onCreate).
 *
 * 채널 ID 매핑:
 * - aura.default          → Firebase Console test 메시지 / channelId 미지정 push의 fallback
 * - aura.briefing.daily   → 아침 daily brief (back/src/modules/briefings/push.ts)
 * - aura.briefing.evening → 저녁 brief (back/src/modules/briefings/evening.ts)
 * - aura.departure_alert  → 출발 시간 자동 푸시 (back/src/modules/departure/service.ts)
 *
 * transit geofence 채널(aura.transit.arrival)은 TransitGeofenceModule에서 별도 관리.
 *
 * 모든 채널은 IMPORTANCE_HIGH — heads-up + sound + vibration 표시.
 */
object NotificationChannelInitializer {

    const val CHANNEL_DEFAULT = "aura.default"
    const val CHANNEL_BRIEFING_DAILY = "aura.briefing.daily"
    const val CHANNEL_BRIEFING_EVENING = "aura.briefing.evening"
    const val CHANNEL_DEPARTURE_ALERT = "aura.departure_alert"

    fun ensureAllChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        registerChannel(
            manager,
            id = CHANNEL_DEFAULT,
            name = "AURA 알림",
            description = "기타 AURA 알림"
        )
        registerChannel(
            manager,
            id = CHANNEL_BRIEFING_DAILY,
            name = "오늘의 브리핑",
            description = "아침에 배달되는 메일/뉴스/날씨 요약"
        )
        registerChannel(
            manager,
            id = CHANNEL_BRIEFING_EVENING,
            name = "저녁 브리핑",
            description = "내일 일정 정리 알림"
        )
        registerChannel(
            manager,
            id = CHANNEL_DEPARTURE_ALERT,
            name = "출발 알림",
            description = "다음 일정 출발 시각 자동 알림"
        )
    }

    private fun registerChannel(
        manager: NotificationManager,
        id: String,
        name: String,
        description: String
    ) {
        if (manager.getNotificationChannel(id) != null) return
        val channel = NotificationChannel(
            id,
            name,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            this.description = description
            enableVibration(true)
            setShowBadge(true)
        }
        manager.createNotificationChannel(channel)
    }
}
