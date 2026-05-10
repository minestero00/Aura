package com.dumbteam.aura.health

import android.content.Intent
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregateMetric
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

/**
 * Health Connect bridge — daily brief 톤 조절(어제 sleep/steps/HR)을 위한 read-only 게이트웨이.
 * 권한 미부여 / Health Connect 미설치 / 데이터 없음 → 모두 null 반환 (silent skip).
 */
class AuraHealthModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "AuraHealth"

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  private val readPermissions: Set<String> = setOf(
    HealthPermission.getReadPermission(SleepSessionRecord::class),
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getReadPermission(HeartRateRecord::class)
  )

  @ReactMethod
  fun readYesterday(promise: Promise) {
    val nullResult = {
      val map = Arguments.createMap()
      map.putNull("sleepMinutes")
      map.putNull("steps")
      map.putNull("avgHrBpm")
      map
    }

    val status = HealthConnectClient.getSdkStatus(ctx)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      promise.resolve(nullResult())
      return
    }

    val client = HealthConnectClient.getOrCreate(ctx)
    scope.launch {
      try {
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.containsAll(readPermissions)) {
          promise.resolve(nullResult())
          return@launch
        }

        val zone = ZoneId.systemDefault()
        val yesterday = LocalDate.now(zone).minusDays(1)
        val start = yesterday.atStartOfDay(zone).toInstant()
        val end = yesterday.plusDays(1).atStartOfDay(zone).toInstant()
        val range = TimeRangeFilter.between(start, end)

        var sleepMin: Long? = null
        try {
          val res = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range))
          if (res.records.isNotEmpty()) {
            sleepMin = res.records.sumOf {
              (it.endTime.epochSecond - it.startTime.epochSecond) / 60
            }
          }
        } catch (_: Exception) {}

        var steps: Long? = null
        try {
          val agg = client.aggregate(
            AggregateRequest(
              metrics = setOf(StepsRecord.COUNT_TOTAL),
              timeRangeFilter = range
            )
          )
          steps = agg[StepsRecord.COUNT_TOTAL]
        } catch (_: Exception) {}

        var avgHr: Long? = null
        try {
          val agg = client.aggregate(
            AggregateRequest(
              metrics = setOf(HeartRateRecord.BPM_AVG),
              timeRangeFilter = range
            )
          )
          avgHr = agg[HeartRateRecord.BPM_AVG]?.toLong()
        } catch (_: Exception) {}

        val map = Arguments.createMap()
        if (sleepMin != null) map.putInt("sleepMinutes", sleepMin.toInt()) else map.putNull("sleepMinutes")
        if (steps != null) map.putInt("steps", steps.toInt()) else map.putNull("steps")
        if (avgHr != null) map.putInt("avgHrBpm", avgHr.toInt()) else map.putNull("avgHrBpm")
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("HEALTH_READ_FAIL", e.message, e)
      }
    }
  }

  /**
   * Health Connect 시스템 화면을 열어 사용자가 권한을 부여하게 한다.
   * ActivityResultContract 기반의 in-app dialog는 MainActivity 통합이 필요하므로 1차에서는 deeplink만.
   * 사용자가 권한을 부여 후 다시 앱으로 돌아오면 readYesterday()가 데이터를 받기 시작한다.
   */
  @ReactMethod
  fun requestPermission(promise: Promise) {
    try {
      val intent = Intent("android.health.connect.action.HEALTH_HOME_SETTINGS")
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("HEALTH_OPEN_FAIL", e.message, e)
    }
  }
}
