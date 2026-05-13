import UIKit
import Social
import UniformTypeIdentifiers

/**
 * AURA - 쿠폰 등록하기 Share Extension.
 *
 * 카카오톡 등에서 이미지를 공유하면 이 Extension이 표시된다. 이미지를:
 *   1. App Group 임시 디렉토리에 file로 저장 (native OCR이 file path 요구)
 *   2. base64로 변환해 UserDefaults에 함께 적재 (RN side 미리보기/fallback)
 * 한 뒤 URL Scheme(aura://share)으로 main app을 깨운다.
 *
 * Main app은 AppDelegate.application(_:open:options:)에서 URL을 받고,
 * AuraShareReceiver(native module)이 pending payload(file path + base64 + mime)를
 * RN으로 전달한다. RN side는 file path로 native OCR → backend extract → WalletExtractModal.
 *
 * 별도 UI는 표시하지 않고 즉시 저장 후 main app으로 전환.
 * SLComposeServiceViewController는 텍스트 입력 UI를 강제하므로 plain UIViewController 사용.
 */
class ShareViewController: UIViewController {
  private let appGroupId = "group.com.dumbteam.aura"
  private let urlScheme = "aura://share"

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    handleSharedItem()
  }

  private func handleSharedItem() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments else {
      completeRequest()
      return
    }

    let imageType = UTType.image.identifier
    let urlType = UTType.url.identifier
    let textType = UTType.plainText.identifier

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(imageType) {
        provider.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] data, _ in
          self?.persistImage(from: data)
          self?.completeAndOpenHost()
        }
        return
      }
    }

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(urlType) {
        provider.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] data, _ in
          if let url = data as? URL {
            self?.persistText(url.absoluteString)
          }
          self?.completeAndOpenHost()
        }
        return
      }
    }

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(textType) {
        provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] data, _ in
          if let text = data as? String {
            self?.persistText(text)
          }
          self?.completeAndOpenHost()
        }
        return
      }
    }

    completeRequest()
  }

  private func persistImage(from data: Any?) {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else { return }

    var imageData: Data?
    var mime = "image/jpeg"
    var ext = "jpg"

    if let url = data as? URL {
      imageData = try? Data(contentsOf: url)
      if url.pathExtension.lowercased() == "png" {
        mime = "image/png"
        ext = "png"
      }
    } else if let image = data as? UIImage {
      imageData = image.jpegData(compressionQuality: 0.92)
    } else if let raw = data as? Data {
      imageData = raw
    }

    guard let bytes = imageData else { return }

    let fileName = "share-\(Int(Date().timeIntervalSince1970 * 1000)).\(ext)"
    let fileURL = containerURL.appendingPathComponent(fileName)
    try? bytes.write(to: fileURL, options: .atomic)

    defaults.set(bytes, forKey: "pendingImage")
    defaults.set(mime, forKey: "pendingImageMime")
    defaults.set(fileURL.path, forKey: "pendingImagePath")
    defaults.set(Date().timeIntervalSince1970, forKey: "pendingImageTimestamp")
  }

  private func persistText(_ text: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(text, forKey: "pendingText")
    defaults.set(Date().timeIntervalSince1970, forKey: "pendingTextTimestamp")
  }

  private func completeAndOpenHost() {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      // iOS 17+ : responder chain selector hack은 막혔다. extensionContext.open
      // (URL)이 Share Extension에서 host app을 여는 합법적 경로.
      // open 완료 콜백 안에서 completeRequest를 호출해 share UI를 닫는다.
      if let url = URL(string: self.urlScheme) {
        self.extensionContext?.open(url, completionHandler: { _ in
          self.completeRequest()
        })
      } else {
        self.completeRequest()
      }
    }
  }

  private func completeRequest() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}
