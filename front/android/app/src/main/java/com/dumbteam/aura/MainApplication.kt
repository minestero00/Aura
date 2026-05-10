package com.dumbteam.aura

import android.app.Application
import com.dumbteam.aura.health.AuraHealthPackage
import com.dumbteam.aura.notifications.NotificationChannelInitializer
import com.dumbteam.aura.transit.TransitGeofenceModule
import com.dumbteam.aura.transit.TransitGeofencePackage
import com.dumbteam.aura.widget.AuraWidgetPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(TransitGeofencePackage())
          add(AuraWidgetPackage())
          add(AuraHealthPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    // 알림 channel을 앱 시작 시 미리 생성 — BR가 cold start 시에도 안전.
    TransitGeofenceModule.ensureNotificationChannel(this)
    // FCM이 사용하는 default + briefing/departure channel 등록.
    NotificationChannelInitializer.ensureAllChannels(this)
  }
}
