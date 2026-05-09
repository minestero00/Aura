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
///
/// region별 stop 이름/타입은 UserDefaults에 영구 저장 — 앱이 완전 종료된
/// 상태에서 OS가 깨워도 알림 메시지에 정류장 이름을 포함할 수 있게.
@objc(TransitGeofence)
class TransitGeofence: RCTEventEmitter, CLLocationManagerDelegate {

  private let locationManager = CLLocationManager()
  private var hasListeners = false
  private let metadataKey = "aura.transit.regionMetadata"

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

      for region in self.locationManager.monitoredRegions {
        self.locationManager.stopMonitoring(for: region)
      }

      var metadata: [String: [String: String]] = [:]
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

        let name = (dict["name"] as? String) ?? ""
        let type = (dict["type"] as? String) ?? "transit-arrival"
        metadata[id] = ["name": name, "type": type]
      }

      UserDefaults.standard.set(metadata, forKey: self.metadataKey)
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
      UserDefaults.standard.removeObject(forKey: self.metadataKey)
      resolver(nil)
    }
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    presentArrivalNotification(regionId: region.identifier)
    if hasListeners {
      sendEvent(withName: "AuraTransitGeofenceEnter", body: ["id": region.identifier])
    }
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
    let metadata = UserDefaults.standard.dictionary(forKey: metadataKey) as? [String: [String: String]] ?? [:]
    let entry = metadata[regionId] ?? [:]
    let stopName = entry["name"] ?? ""
    let type = entry["type"] ?? "transit-arrival"

    let content = UNMutableNotificationContent()
    content.title = "AURA 도착 알림"
    if type == "destination" {
      if stopName.isEmpty {
        content.body = "목적지에 거의 도착했어요. 조심히 도착하셨나요?"
      } else {
        content.body = "\(stopName)에 거의 도착했어요. 조심히 도착하셨나요?"
      }
    } else {
      if stopName.isEmpty {
        content.body = "정류장 근처에 도착했습니다."
      } else {
        content.body = "\(stopName) 근처에 도착했습니다."
      }
    }
    content.sound = .default
    content.userInfo = [
      "type": type,
      "regionId": regionId,
      "stopName": stopName
    ]
    let request = UNNotificationRequest(
      identifier: "aura-transit-arrival-\(regionId)",
      content: content,
      trigger: nil
    )
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }
}
