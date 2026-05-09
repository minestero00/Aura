import Foundation
import CoreLocation
import UserNotifications
import React

/// Background-safe transit geofence module.
///
/// JS가 trip 시작/leg 변경 시 `startMonitoring(regions)`를 부르면 iOS Region
/// Monitoring으로 등록한다. ENTER 이벤트는 OS가 앱이 background/suspended
/// 상태에서도 깨워서 전달한다.
///
/// ENTER 시 즉시 local notification을 표시(JS가 안 떠 있어도 사용자에게는
/// 알림이 보임). 동시에 `AuraTransitGeofenceEnter` 이벤트를 JS로 send해
/// foreground일 땐 banner UI도 같이 advance 한다.
@objc(TransitGeofence)
class TransitGeofence: RCTEventEmitter, CLLocationManagerDelegate {

  private let locationManager = CLLocationManager()
  private var hasListeners = false

  override init() {
    super.init()
    locationManager.delegate = self
    locationManager.allowsBackgroundLocationUpdates = false
    locationManager.pausesLocationUpdatesAutomatically = true
  }

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["AuraTransitGeofenceEnter", "AuraTransitGeofenceError"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: - Bridge methods

  @objc(startMonitoring:resolver:rejecter:)
  func startMonitoring(_ regions: NSArray,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.locationManager.requestAlwaysAuthorization()

      // 기존 등록 모두 stop (중복 방지)
      for region in self.locationManager.monitoredRegions {
        self.locationManager.stopMonitoring(for: region)
      }

      var added = 0
      for raw in regions {
        guard
          let dict = raw as? [String: Any],
          let id = dict["id"] as? String,
          let lat = dict["lat"] as? Double,
          let lng = dict["lng"] as? Double
        else { continue }
        let radius = (dict["radius"] as? Double) ?? 150.0
        let clamped = min(radius, self.locationManager.maximumRegionMonitoringDistance)
        let region = CLCircularRegion(
          center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
          radius: clamped,
          identifier: id
        )
        region.notifyOnEntry = true
        region.notifyOnExit = false
        self.locationManager.startMonitoring(for: region)
        added += 1
      }
      resolver(["added": added])
    }
  }

  @objc(stopMonitoring:rejecter:)
  func stopMonitoring(_ resolver: @escaping RCTPromiseResolveBlock,
                      rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      for region in self.locationManager.monitoredRegions {
        self.locationManager.stopMonitoring(for: region)
      }
      resolver(nil)
    }
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    presentArrivalNotification(regionId: region.identifier)
    if hasListeners {
      sendEvent(withName: "AuraTransitGeofenceEnter", body: ["id": region.identifier])
    }
    // 같은 region 재진입 알림 방지 — leg 진행 후 JS가 새로 startMonitoring
    // 하면 새 region set으로 교체된다. 여기서는 한 번 ENTER 후 자체 stop.
    manager.stopMonitoring(for: region)
  }

  func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
    if hasListeners {
      sendEvent(withName: "AuraTransitGeofenceError", body: [
        "id": region?.identifier ?? "",
        "message": error.localizedDescription
      ])
    }
  }

  // MARK: - Local notification

  private func presentArrivalNotification(regionId: String) {
    let content = UNMutableNotificationContent()
    content.title = "AURA 도착 알림"
    content.body = "정류장 근처에 도착했습니다."
    content.sound = .default
    content.userInfo = [
      "type": "transit-arrival",
      "regionId": regionId
    ]
    let request = UNNotificationRequest(
      identifier: "aura-transit-arrival-\(regionId)",
      content: content,
      trigger: nil
    )
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }
}
