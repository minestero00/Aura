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
    NSLog("[AURA-SHARE-TRACE] notifyShareReceived shared=%@", shared == nil ? "nil" : "set")
    shared?.emitPending()
  }

  private func emitPending() {
    NSLog("[AURA-SHARE-TRACE] emitPending hasListeners=%@", hasListeners ? "YES" : "NO")
    guard hasListeners, let payload = readPendingPayload() else {
      NSLog("[AURA-SHARE-TRACE] emitPending skipped (no listener or no payload)")
      return
    }
    NSLog("[AURA-SHARE-TRACE] emitPending sending event kind=%@", payload["kind"] as? String ?? "?")
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
    let payload = readPendingPayload()
    NSLog("[AURA-SHARE-TRACE] fetchPending payload=%@", payload == nil ? "nil" : (payload?["kind"] as? String ?? "?"))
    resolver(payload)
  }

  /**
   * Main app → Share Extension에 auth token + API base URL을 공유.
   * Share Extension은 sandboxed라 main app의 AsyncStorage/Supabase 세션에 접근 불가.
   * App Group UserDefaults가 유일하게 합법적인 공유 채널.
   *
   * 호출 시점:
   * - 앱 launch 시 (현재 session 즉시 mirror)
   * - supabase.auth.onAuthStateChange (login / TOKEN_REFRESHED / logout)
   * - logout 시 token nil로 호출해 extension에서 401 발생 → "AURA 로그인 필요" 안내
   */
  /**
   * RN 측에서 쿠폰을 다른 사람에게 공유. iOS UIActivityViewController를 RCT root에
   * present. message + optional image(base64). 외부 라이브러리(react-native-share 등)
   * 추가 의존성 없이 처리.
   *
   * 호출: NativeModules.AuraShareReceiver.presentShareSheet(message, base64orNull)
   */
  @objc func presentShareSheet(
    _ message: NSString,
    base64Image: NSString?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    var items: [Any] = [message as String]
    if let b64 = base64Image as String?, !b64.isEmpty {
      // base64 data URI prefix("data:image/...;base64,") 제거 후 decode.
      let raw: String
      if let commaIdx = b64.firstIndex(of: ","), b64.hasPrefix("data:") {
        raw = String(b64[b64.index(after: commaIdx)...])
      } else {
        raw = b64
      }
      if let data = Data(base64Encoded: raw, options: .ignoreUnknownCharacters),
         let img = UIImage(data: data) {
        items.insert(img, at: 0)
      }
    }
    DispatchQueue.main.async {
      guard let rootVC = UIApplication.shared.delegate?.window??.rootViewController else {
        rejecter("ERR_NO_ROOT", "No root view controller", nil)
        return
      }
      let activity = UIActivityViewController(activityItems: items, applicationActivities: nil)
      // iPad popover anchor — iPad에서 sourceView 없으면 crash.
      if let pop = activity.popoverPresentationController {
        pop.sourceView = rootVC.view
        pop.sourceRect = CGRect(x: rootVC.view.bounds.midX, y: rootVC.view.bounds.midY, width: 0, height: 0)
        pop.permittedArrowDirections = []
      }
      // 가장 위 modal까지 traverse해서 그 위에 present.
      var presenter: UIViewController = rootVC
      while let next = presenter.presentedViewController { presenter = next }
      presenter.present(activity, animated: true) {
        resolver(nil)
      }
    }
  }

  @objc func setSharedSession(
    _ accessToken: NSString?,
    apiBase: NSString?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      rejecter("ERR_DEFAULTS", "App Group UserDefaults unavailable", nil)
      return
    }
    if let token = accessToken as String?, !token.isEmpty {
      defaults.set(token, forKey: "accessToken")
    } else {
      defaults.removeObject(forKey: "accessToken")
    }
    if let base = apiBase as String?, !base.isEmpty {
      defaults.set(base, forKey: "apiBase")
    }
    defaults.set(Date().timeIntervalSince1970, forKey: "sessionMirroredAt")
    defaults.synchronize()
    NSLog("[AURA-SHARE-TRACE] setSharedSession token=%@ apiBase=%@", accessToken == nil ? "nil" : "set", apiBase ?? "nil")
    resolver(nil)
  }

  private func readPendingPayload() -> [String: Any]? {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return nil }

    // TTL 안전망 — 1시간 넘은 payload는 stale로 간주하고 폐기.
    // share extension은 저장하지만 host app open에 실패할 수 있어 (특히 시뮬에서),
    // 그러면 다음 cold start마다 oldest payload가 modal을 띄우는 상태가 됨.
    let ttl: TimeInterval = 3600
    let now = Date().timeIntervalSince1970
    let imgTs = defaults.double(forKey: "pendingImageTimestamp")
    if imgTs > 0 && now - imgTs > ttl {
      defaults.removeObject(forKey: "pendingImage")
      defaults.removeObject(forKey: "pendingImageMime")
      defaults.removeObject(forKey: "pendingImagePath")
      defaults.removeObject(forKey: "pendingImageTimestamp")
      defaults.synchronize()
    }
    let txtTs = defaults.double(forKey: "pendingTextTimestamp")
    if txtTs > 0 && now - txtTs > ttl {
      defaults.removeObject(forKey: "pendingText")
      defaults.removeObject(forKey: "pendingTextTimestamp")
      defaults.synchronize()
    }

    if let data = defaults.data(forKey: "pendingImage") {
      let mime = defaults.string(forKey: "pendingImageMime") ?? "image/jpeg"
      let path = defaults.string(forKey: "pendingImagePath")
      let base64 = data.base64EncodedString()
      defaults.removeObject(forKey: "pendingImage")
      defaults.removeObject(forKey: "pendingImageMime")
      defaults.removeObject(forKey: "pendingImagePath")
      defaults.removeObject(forKey: "pendingImageTimestamp")
      // App Group UserDefaults는 process 간 sync에 지연이 있어 명시적 synchronize 필요.
      // 미호출 시 main app reload마다 같은 payload가 다시 잡혀 modal이 무한 재발생.
      defaults.synchronize()
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
      defaults.synchronize()
      return ["kind": "text", "text": text]
    }
    return nil
  }
}
