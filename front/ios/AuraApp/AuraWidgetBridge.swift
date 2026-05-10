import Foundation
import React
import WidgetKit

// RN ↔ iOS Widget bridge. Android의 AuraWidgetModule과 동일한 인터페이스 (NativeModules.AuraWidget).
// RN이 setNextEvent를 호출하면 App Group UserDefaults에 저장 + WidgetCenter로 즉시 timeline 재요청.
//
// App Group 설정은 메인 앱(AuraApp) + Widget Extension(AuraWidget) 둘 다 같은 group ID로
// entitlement에 등록되어야 작동 — manual/IOS_WIDGET_SETUP.md 참고.

@objc(AuraWidget)
class AuraWidgetBridge: NSObject {

  private let appGroup = "group.com.dumbteam.aura"
  private let widgetKind = "AuraWidget"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(setNextEvent:resolver:rejecter:)
  func setNextEvent(
    _ payload: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      rejecter("WIDGET_NO_GROUP", "UserDefaults app group not available", nil)
      return
    }
    defaults.setValue(optString(payload, "title"), forKey: "next.title")
    defaults.setValue(optString(payload, "meta"), forKey: "next.meta")
    defaults.setValue(optString(payload, "location"), forKey: "next.location")
    defaults.setValue(optString(payload, "emptyMessage"), forKey: "next.emptyMessage")
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    }
    resolver(nil)
  }

  @objc(clearNextEvent:rejecter:)
  func clearNextEvent(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      rejecter("WIDGET_NO_GROUP", "UserDefaults app group not available", nil)
      return
    }
    for key in ["next.title", "next.meta", "next.location", "next.emptyMessage"] {
      defaults.removeObject(forKey: key)
    }
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    }
    resolver(nil)
  }

  private func optString(_ dict: NSDictionary, _ key: String) -> String? {
    guard let raw = dict[key] else { return nil }
    if raw is NSNull { return nil }
    if let s = raw as? String { return s.isEmpty ? nil : s }
    return nil
  }
}
