import Foundation
import React

/**
 * Share Extension(`AuraCouponShare`)이 App Group UserDefaults에 적재한 pending
 * 이미지/텍스트를 RN으로 전달하는 native module.
 *
 * 동작:
 * 1. Share Extension이 `pendingImage` (Data, base64로 변환 전 raw bytes) +
 *    `pendingImageMime`를 group.com.dumbteam.aura에 저장하고 aura://share 호출
 * 2. AppDelegate가 URL을 받으면 emitPending()을 호출 → RN에 onShareReceived 이벤트
 * 3. 첫 launch 시(앱이 종료된 상태에서 share로 깨어남) RN이 직접 fetchPending()을
 *    호출해 pending data 가져감
 *
 * RN side (`features/wallet/share-receiver.ts`)에서 listener 등록 + initial pending
 * 확인 → WalletExtractModal 자동 열기.
 */
@objc(AuraShareReceiver)
class AuraShareReceiver: RCTEventEmitter {
  private let appGroupId = "group.com.dumbteam.aura"
  private static var shared: AuraShareReceiver?
  private var hasListeners = false

  override init() {
    super.init()
    AuraShareReceiver.shared = self
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! { ["onShareReceived"] }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  /**
   * AppDelegate가 aura://share URL을 받았을 때 호출. RN listener가 활성이면 즉시
   * 이벤트 전달, 아니면 다음 fetchPending() 호출까지 대기.
   */
  @objc static func notifyShareReceived() {
    shared?.emitPending()
  }

  private func emitPending() {
    guard hasListeners, let payload = readPendingPayload() else { return }
    sendEvent(withName: "onShareReceived", body: payload)
  }

  /**
   * RN이 startup 시 호출 — 앱이 cold start인 경우 listener가 아직 없을 수 있어
   * native 이벤트로는 못 받을 수 있다. 이 함수로 직접 가져감.
   */
  @objc func fetchPending(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    resolver(readPendingPayload())
  }

  private func readPendingPayload() -> [String: Any]? {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return nil }
    if let data = defaults.data(forKey: "pendingImage") {
      let mime = defaults.string(forKey: "pendingImageMime") ?? "image/jpeg"
      let path = defaults.string(forKey: "pendingImagePath")
      let base64 = data.base64EncodedString()
      defaults.removeObject(forKey: "pendingImage")
      defaults.removeObject(forKey: "pendingImageMime")
      defaults.removeObject(forKey: "pendingImagePath")
      defaults.removeObject(forKey: "pendingImageTimestamp")
      var payload: [String: Any] = [
        "kind": "image",
        "imageBase64": base64,
        "imageMime": mime
      ]
      if let path = path {
        // file:// 형태로 RN에 전달 — native OCR이 이 path를 직접 읽는다.
        payload["imagePath"] = "file://\(path)"
      }
      return payload
    }
    if let text = defaults.string(forKey: "pendingText") {
      defaults.removeObject(forKey: "pendingText")
      defaults.removeObject(forKey: "pendingTextTimestamp")
      return ["kind": "text", "text": text]
    }
    return nil
  }
}
