import UIKit
import Social
import UniformTypeIdentifiers

/**
 * AURA - 쿠폰 등록하기 Share Extension.
 *
 * 카카오톡 등에서 이미지를 공유하면 이 Extension이 표시된다. 이미지를:
 *   1. App Group 임시 디렉토리에 file로 저장 (native OCR이 file path 요구)
 *   2. base64로 변환해 UserDefaults에 함께 적재 (RN side 미리보기/fallback)
 * 한 뒤 사용자가 "AURA에서 열기" 버튼을 탭하면 main app으로 전환.
 *
 * 왜 자동 open이 아니라 button UI인가:
 * iOS 18+에서 share extension의 extensionContext.open(_:)는 user-gesture 컨텍스트
 * 밖에서 호출되면 silent fail한다 (실제로 success=NO 반환되거나 silent drop).
 * UIApplication.openURL: 같은 responder-chain workaround도 iOS 18+에서 no-op.
 * 사용자가 직접 버튼을 탭하는 것만이 신뢰성 있는 user-gesture로 인정된다.
 *
 * Main app은 AppDelegate.application(_:open:options:)에서 URL을 받고,
 * AuraShareReceiver(native module)이 pending payload(file path + base64 + mime)를
 * RN으로 전달한다.
 */
class ShareViewController: UIViewController {
  private let appGroupId = "group.com.dumbteam.aura"
  private let urlScheme = "aura://share"

  private let statusLabel = UILabel()
  private let openButton = UIButton(type: .system)
  private let cancelButton = UIButton(type: .system)
  private var payloadReady = false

  override func viewDidLoad() {
    super.viewDidLoad()
    NSLog("[AURA-SHARE-TRACE] ShareVC viewDidLoad")
    view.backgroundColor = .systemBackground
    setupUI()
    handleSharedItem()
  }

  private func setupUI() {
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    statusLabel.text = "쿠폰 이미지 저장 중..."
    statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    statusLabel.textColor = .label
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0
    view.addSubview(statusLabel)

    openButton.translatesAutoresizingMaskIntoConstraints = false
    openButton.setTitle("AURA에서 열기", for: .normal)
    openButton.setTitleColor(.white, for: .normal)
    openButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    openButton.backgroundColor = .systemBlue
    openButton.layer.cornerRadius = 12
    openButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 28, bottom: 14, right: 28)
    openButton.addTarget(self, action: #selector(onOpenTapped), for: .touchUpInside)
    openButton.isEnabled = false
    openButton.alpha = 0.5
    view.addSubview(openButton)

    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.setTitle("취소", for: .normal)
    cancelButton.setTitleColor(.secondaryLabel, for: .normal)
    cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 15, weight: .regular)
    cancelButton.addTarget(self, action: #selector(onCancelTapped), for: .touchUpInside)
    view.addSubview(cancelButton)

    NSLayoutConstraint.activate([
      statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
      statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
      statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),

      openButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      openButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 24),

      cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      cancelButton.topAnchor.constraint(equalTo: openButton.bottomAnchor, constant: 16)
    ])
  }

  private func markPayloadReady(success: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.payloadReady = success
      if success {
        self.statusLabel.text = "이미지가 준비됐어요"
        self.openButton.isEnabled = true
        self.openButton.alpha = 1
      } else {
        self.statusLabel.text = "이미지를 불러올 수 없어요"
        self.openButton.isEnabled = false
        self.openButton.alpha = 0.4
      }
    }
  }

  @objc private func onOpenTapped() {
    NSLog("[AURA-SHARE-TRACE] open button tapped")
    guard let url = URL(string: urlScheme) else {
      completeRequest()
      return
    }
    // user-gesture context이므로 iOS가 open을 허용한다.
    extensionContext?.open(url, completionHandler: { [weak self] success in
      NSLog("[AURA-SHARE-TRACE] ext.open completion success=%@", success ? "YES" : "NO")
      self?.completeRequest()
    })
  }

  @objc private func onCancelTapped() {
    NSLog("[AURA-SHARE-TRACE] cancel button tapped")
    completeRequest()
  }

  private func handleSharedItem() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments else {
      markPayloadReady(success: false)
      return
    }

    let imageType = UTType.image.identifier
    let urlType = UTType.url.identifier
    let textType = UTType.plainText.identifier

    for provider in attachments {
      if provider.hasItemConformingToTypeIdentifier(imageType) {
        provider.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] data, _ in
          let ok = self?.persistImage(from: data) ?? false
          self?.markPayloadReady(success: ok)
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
          self?.markPayloadReady(success: true)
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
          self?.markPayloadReady(success: true)
        }
        return
      }
    }

    markPayloadReady(success: false)
  }

  @discardableResult
  private func persistImage(from data: Any?) -> Bool {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else { return false }

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

    guard let bytes = imageData else { return false }

    let fileName = "share-\(Int(Date().timeIntervalSince1970 * 1000)).\(ext)"
    let fileURL = containerURL.appendingPathComponent(fileName)
    try? bytes.write(to: fileURL, options: .atomic)

    defaults.set(bytes, forKey: "pendingImage")
    defaults.set(mime, forKey: "pendingImageMime")
    defaults.set(fileURL.path, forKey: "pendingImagePath")
    defaults.set(Date().timeIntervalSince1970, forKey: "pendingImageTimestamp")
    return true
  }

  private func persistText(_ text: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(text, forKey: "pendingText")
    defaults.set(Date().timeIntervalSince1970, forKey: "pendingTextTimestamp")
  }

  private func completeRequest() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}
