import UIKit
import Social
import Vision
import UniformTypeIdentifiers

/**
 * AURA - 쿠폰 등록 Share Extension (self-contained 버전).
 *
 * 흐름:
 *   1. viewDidLoad — App Group UserDefaults에서 token + apiBase 읽기
 *   2. attachment load → UIImage 확보
 *   3. Vision OCR로 한국어 + 영어 텍스트 추출
 *   4. backend `/wallet/coupons/extract-from-image-text` 호출 → candidate
 *   5. form UI에 prefill 후 사용자 확인/수정
 *   6. 사용자가 "저장" 탭 → backend `/wallet/coupons` POST
 *   7. 성공 시 ✓ 메시지 → 자동 dismiss
 *
 * iOS 18+에서 share extension의 extensionContext.open(host app URL)이 silent fail해
 * AURA를 직접 열 수 없는 제약을 우회. extension이 자체 완결하므로 main app open 불필요.
 *
 * 인증/네트워크 전제:
 *   - main app(src/lib/supabase/client.ts)이 onAuthStateChange에서
 *     AuraShareReceiver.setSharedSession(token, apiBase)를 호출해 App Group에 mirror
 *   - 토큰이 만료된 경우 401 → "AURA에서 다시 로그인 후 시도" 안내
 */
class ShareViewController: UIViewController {
  private let appGroupId = "group.com.dumbteam.aura"

  // 처리 단계.
  private enum Stage {
    case loading        // 이미지 + 세션 준비
    case ocr            // OCR + extract 실행
    case form           // form 입력 가능
    case saving         // POST 진행
    case done           // 저장 완료, 곧 dismiss
    case error(String)  // 에러 메시지
  }

  // App Group 공유 세션.
  private var accessToken: String?
  private var apiBase: String?

  // 처리 대상.
  private var sharedImage: UIImage?
  private var sharedImageData: Data?
  private var sharedImageMime: String = "image/jpeg"
  private var ocrText: String?
  private var candidate: CouponCandidate?

  // 폼 모델 (사용자 수정 가능).
  private var formBrand: String = ""
  private var formTitle: String = ""
  private var formCode: String = ""
  private var formCodeFormat: String = "barcode_code128"
  private var formExpires: String = ""

  // UI.
  private let scrollView = UIScrollView()
  private let contentStack = UIStackView()
  private let statusLabel = UILabel()
  private let activityIndicator = UIActivityIndicatorView(style: .medium)
  private let imageView = UIImageView()
  private let brandField = UITextField()
  private let titleField = UITextField()
  private let codeField = UITextField()
  private let formatSegment = UISegmentedControl(items: ["바코드", "QR", "텍스트만"])
  private let expiresField = UITextField()
  private let saveButton = UIButton(type: .system)
  private let cancelButton = UIButton(type: .system)
  private let confirmCheck = UILabel()

  override func viewDidLoad() {
    super.viewDidLoad()
    NSLog("[AURA-SHARE-TRACE] ShareVC viewDidLoad (self-contained)")
    view.backgroundColor = .systemBackground
    loadSharedSession()
    setupUI()
    setStage(.loading)
    loadAttachment()
  }

  // MARK: - Session

  private func loadSharedSession() {
    let defaults = UserDefaults(suiteName: appGroupId)
    accessToken = defaults?.string(forKey: "accessToken")
    apiBase = defaults?.string(forKey: "apiBase")
    NSLog("[AURA-SHARE-TRACE] session token=%@ apiBase=%@",
          accessToken == nil ? "nil" : "set",
          apiBase ?? "nil")
  }

  // MARK: - UI

  private func setupUI() {
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    scrollView.keyboardDismissMode = .interactive
    view.addSubview(scrollView)

    contentStack.translatesAutoresizingMaskIntoConstraints = false
    contentStack.axis = .vertical
    contentStack.spacing = 12
    contentStack.alignment = .fill
    scrollView.addSubview(contentStack)

    // Header
    let header = UILabel()
    header.text = "AURA에 쿠폰 등록"
    header.font = UIFont.systemFont(ofSize: 20, weight: .bold)
    header.textColor = .label
    contentStack.addArrangedSubview(header)

    // Status row (activity + text)
    let statusRow = UIStackView()
    statusRow.axis = .horizontal
    statusRow.spacing = 8
    statusRow.alignment = .center
    activityIndicator.hidesWhenStopped = true
    statusLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
    statusLabel.textColor = .secondaryLabel
    statusLabel.numberOfLines = 0
    confirmCheck.text = "✓"
    confirmCheck.font = UIFont.systemFont(ofSize: 18, weight: .bold)
    confirmCheck.textColor = .systemGreen
    confirmCheck.isHidden = true
    statusRow.addArrangedSubview(activityIndicator)
    statusRow.addArrangedSubview(confirmCheck)
    statusRow.addArrangedSubview(statusLabel)
    contentStack.addArrangedSubview(statusRow)

    // Image preview (small thumbnail)
    imageView.translatesAutoresizingMaskIntoConstraints = false
    imageView.contentMode = .scaleAspectFit
    imageView.backgroundColor = .secondarySystemBackground
    imageView.layer.cornerRadius = 8
    imageView.clipsToBounds = true
    imageView.heightAnchor.constraint(equalToConstant: 140).isActive = true
    contentStack.addArrangedSubview(imageView)

    // Form fields
    contentStack.addArrangedSubview(makeFieldLabel("브랜드"))
    contentStack.addArrangedSubview(brandField)
    styleField(brandField, placeholder: "예: 스타벅스, GS25")
    brandField.addTarget(self, action: #selector(onBrandChanged), for: .editingChanged)

    contentStack.addArrangedSubview(makeFieldLabel("이름"))
    contentStack.addArrangedSubview(titleField)
    styleField(titleField, placeholder: "예: 아메리카노 Tall")
    titleField.addTarget(self, action: #selector(onTitleChanged), for: .editingChanged)

    contentStack.addArrangedSubview(makeFieldLabel("코드 / 번호"))
    contentStack.addArrangedSubview(codeField)
    styleField(codeField, placeholder: "바코드 번호 또는 코드")
    codeField.autocapitalizationType = .none
    codeField.autocorrectionType = .no
    codeField.addTarget(self, action: #selector(onCodeChanged), for: .editingChanged)

    contentStack.addArrangedSubview(makeFieldLabel("코드 형식"))
    formatSegment.selectedSegmentIndex = 0
    formatSegment.addTarget(self, action: #selector(onFormatChanged), for: .valueChanged)
    contentStack.addArrangedSubview(formatSegment)

    contentStack.addArrangedSubview(makeFieldLabel("유효기간 (YYYY-MM-DD, 선택)"))
    contentStack.addArrangedSubview(expiresField)
    styleField(expiresField, placeholder: "예: 2026-12-31")
    expiresField.autocapitalizationType = .none
    expiresField.autocorrectionType = .no
    expiresField.addTarget(self, action: #selector(onExpiresChanged), for: .editingChanged)

    // Buttons row
    let buttonsRow = UIStackView()
    buttonsRow.axis = .horizontal
    buttonsRow.distribution = .fillEqually
    buttonsRow.spacing = 12

    cancelButton.setTitle("취소", for: .normal)
    cancelButton.setTitleColor(.systemGray, for: .normal)
    cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    cancelButton.backgroundColor = .secondarySystemBackground
    cancelButton.layer.cornerRadius = 12
    cancelButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
    cancelButton.addTarget(self, action: #selector(onCancelTapped), for: .touchUpInside)

    saveButton.setTitle("AURA에 저장", for: .normal)
    saveButton.setTitleColor(.white, for: .normal)
    saveButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    saveButton.backgroundColor = .systemBlue
    saveButton.layer.cornerRadius = 12
    saveButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
    saveButton.addTarget(self, action: #selector(onSaveTapped), for: .touchUpInside)

    buttonsRow.addArrangedSubview(cancelButton)
    buttonsRow.addArrangedSubview(saveButton)
    contentStack.addArrangedSubview(buttonsRow)

    NSLayoutConstraint.activate([
      scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

      contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
      contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
      contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
      contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -20),
      contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40)
    ])
  }

  private func makeFieldLabel(_ text: String) -> UILabel {
    let l = UILabel()
    l.text = text
    l.font = UIFont.systemFont(ofSize: 13, weight: .semibold)
    l.textColor = .secondaryLabel
    return l
  }

  private func styleField(_ f: UITextField, placeholder: String) {
    f.placeholder = placeholder
    f.borderStyle = .roundedRect
    f.font = UIFont.systemFont(ofSize: 16)
    f.heightAnchor.constraint(equalToConstant: 44).isActive = true
  }

  private func setStage(_ stage: Stage) {
    switch stage {
    case .loading:
      statusLabel.text = "이미지를 불러오는 중..."
      statusLabel.textColor = .secondaryLabel
      activityIndicator.startAnimating()
      confirmCheck.isHidden = true
      saveButton.isEnabled = false
      saveButton.alpha = 0.5
    case .ocr:
      statusLabel.text = "이미지에서 정보 추출 중..."
      statusLabel.textColor = .secondaryLabel
      activityIndicator.startAnimating()
      confirmCheck.isHidden = true
      saveButton.isEnabled = false
      saveButton.alpha = 0.5
    case .form:
      statusLabel.text = "내용을 확인하고 저장하세요"
      statusLabel.textColor = .secondaryLabel
      activityIndicator.stopAnimating()
      confirmCheck.isHidden = true
      saveButton.isEnabled = true
      saveButton.alpha = 1.0
    case .saving:
      statusLabel.text = "저장 중..."
      statusLabel.textColor = .secondaryLabel
      activityIndicator.startAnimating()
      confirmCheck.isHidden = true
      saveButton.isEnabled = false
      saveButton.alpha = 0.5
    case .done:
      statusLabel.text = "AURA 지갑에 저장됐어요"
      statusLabel.textColor = .systemGreen
      activityIndicator.stopAnimating()
      confirmCheck.isHidden = false
      saveButton.isEnabled = false
      saveButton.alpha = 0.5
    case .error(let message):
      statusLabel.text = message
      statusLabel.textColor = .systemRed
      activityIndicator.stopAnimating()
      confirmCheck.isHidden = true
      saveButton.isEnabled = !message.contains("로그인")
      saveButton.alpha = saveButton.isEnabled ? 1.0 : 0.5
    }
  }

  // MARK: - Attachment loading

  private func loadAttachment() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = item.attachments else {
      DispatchQueue.main.async { self.setStage(.error("공유된 이미지가 없어요")) }
      return
    }
    let imageType = UTType.image.identifier
    for provider in attachments where provider.hasItemConformingToTypeIdentifier(imageType) {
      provider.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] data, _ in
        guard let self else { return }
        self.processLoadedItem(data: data)
      }
      return
    }
    DispatchQueue.main.async { self.setStage(.error("이미지만 등록 가능합니다")) }
  }

  private func processLoadedItem(data: Any?) {
    var image: UIImage?
    var bytes: Data?
    var mime = "image/jpeg"

    if let url = data as? URL, let d = try? Data(contentsOf: url) {
      bytes = d
      image = UIImage(data: d)
      if url.pathExtension.lowercased() == "png" { mime = "image/png" }
    } else if let img = data as? UIImage {
      image = img
      bytes = img.jpegData(compressionQuality: 0.92)
    } else if let raw = data as? Data {
      bytes = raw
      image = UIImage(data: raw)
    }

    guard let img = image, let imgBytes = bytes else {
      DispatchQueue.main.async { self.setStage(.error("이미지를 처리할 수 없어요")) }
      return
    }
    sharedImage = img
    sharedImageData = imgBytes
    sharedImageMime = mime

    DispatchQueue.main.async {
      self.imageView.image = img
      // 세션 미설정이면 저장이 401이 될 것 → 폼에서 막기.
      if self.accessToken == nil || (self.apiBase ?? "").isEmpty {
        self.setStage(.error("AURA에 먼저 로그인해 주세요"))
        return
      }
      self.setStage(.ocr)
      self.runOCRAndExtract(image: img)
    }
  }

  // MARK: - OCR + extract

  private func runOCRAndExtract(image: UIImage) {
    Task.detached(priority: .userInitiated) { [weak self] in
      guard let self else { return }
      let text = await Self.recognizeText(image: image)
      self.ocrText = text
      NSLog("[AURA-SHARE-TRACE] OCR text length=%d", text?.count ?? 0)

      guard let text = text, !text.isEmpty else {
        await MainActor.run {
          // OCR이 비어도 폼은 활성화 — 사용자가 직접 입력 가능
          self.setStage(.form)
        }
        return
      }

      guard let apiBase = self.apiBase, let token = self.accessToken else {
        await MainActor.run { self.setStage(.error("AURA에 먼저 로그인해 주세요")) }
        return
      }
      let client = ApiClient(baseUrl: apiBase, token: token)
      do {
        let candidate = try await client.extract(rawText: text, language: "ko")
        NSLog("[AURA-SHARE-TRACE] extract confidence=%f", candidate.confidence)
        self.candidate = candidate
        await MainActor.run { self.applyCandidate(candidate) }
      } catch ApiError.unauthorized {
        await MainActor.run { self.setStage(.error("AURA에 다시 로그인해 주세요")) }
      } catch {
        // extract 실패해도 폼은 열어서 수동 입력 허용
        NSLog("[AURA-SHARE-TRACE] extract failed: %@", "\(error)")
        await MainActor.run { self.setStage(.form) }
      }
    }
  }

  private func applyCandidate(_ c: CouponCandidate) {
    formBrand = c.brand ?? ""
    formTitle = c.title ?? ""
    formCode = c.code ?? ""
    formCodeFormat = c.codeFormat ?? "barcode_code128"
    formExpires = Self.isoToDateInput(c.expiresAt)

    brandField.text = formBrand
    titleField.text = formTitle
    codeField.text = formCode
    formatSegment.selectedSegmentIndex = Self.codeFormatIndex(formCodeFormat)
    expiresField.text = formExpires

    setStage(.form)
  }

  private static func codeFormatIndex(_ fmt: String) -> Int {
    if fmt == "barcode_qr" { return 1 }
    if fmt == "text_only" { return 2 }
    return 0  // barcode_code128 / barcode_ean13 / barcode_other → 바코드
  }

  private static func codeFormatString(from idx: Int) -> String {
    switch idx {
    case 1: return "barcode_qr"
    case 2: return "text_only"
    default: return "barcode_code128"
    }
  }

  private static func isoToDateInput(_ iso: String?) -> String {
    guard let iso = iso else { return "" }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let date = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    guard let date = date else { return "" }
    let out = DateFormatter()
    out.dateFormat = "yyyy-MM-dd"
    return out.string(from: date)
  }

  private static func dateInputToIso(_ input: String) -> String? {
    let trimmed = input.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty else { return nil }
    let inFmt = DateFormatter()
    inFmt.dateFormat = "yyyy-MM-dd"
    inFmt.timeZone = TimeZone(identifier: "Asia/Seoul")
    guard let d = inFmt.date(from: trimmed) else { return nil }
    // 그 날 23:59:59까지 유효로 간주.
    let cal = Calendar(identifier: .gregorian)
    let comps = DateComponents(hour: 23, minute: 59, second: 59)
    let endOfDay = cal.date(byAdding: comps, to: cal.startOfDay(for: d)) ?? d
    let outFmt = ISO8601DateFormatter()
    outFmt.formatOptions = [.withInternetDateTime]
    return outFmt.string(from: endOfDay)
  }

  private static func recognizeText(image: UIImage) async -> String? {
    guard let cgImage = image.cgImage else { return nil }
    return await withCheckedContinuation { (continuation: CheckedContinuation<String?, Never>) in
      let request = VNRecognizeTextRequest { request, _ in
        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        let text = observations
          .compactMap { $0.topCandidates(1).first?.string }
          .joined(separator: "\n")
        continuation.resume(returning: text.isEmpty ? nil : text)
      }
      request.recognitionLevel = .accurate
      request.recognitionLanguages = ["ko-KR", "en-US"]
      request.usesLanguageCorrection = true
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
      } catch {
        continuation.resume(returning: nil)
      }
    }
  }

  // MARK: - Field handlers

  @objc private func onBrandChanged() { formBrand = brandField.text ?? "" }
  @objc private func onTitleChanged() { formTitle = titleField.text ?? "" }
  @objc private func onCodeChanged() { formCode = codeField.text ?? "" }
  @objc private func onFormatChanged() {
    formCodeFormat = Self.codeFormatString(from: formatSegment.selectedSegmentIndex)
  }
  @objc private func onExpiresChanged() { formExpires = expiresField.text ?? "" }

  // MARK: - Save

  @objc private func onSaveTapped() {
    let brand = formBrand.trimmingCharacters(in: .whitespacesAndNewlines)
    let title = formTitle.trimmingCharacters(in: .whitespacesAndNewlines)
    let code = formCode.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !brand.isEmpty, !title.isEmpty, !code.isEmpty else {
      setStage(.error("브랜드 / 이름 / 코드는 필수입니다"))
      return
    }
    guard let apiBase = apiBase, let token = accessToken, !token.isEmpty else {
      setStage(.error("AURA에 먼저 로그인해 주세요"))
      return
    }
    setStage(.saving)
    let codeImageBase64: String? = sharedImageData
      .map { "data:\(sharedImageMime);base64,\($0.base64EncodedString())" }
    let input = CreateCouponInput(
      brand: brand,
      title: title,
      code: code,
      codeFormat: formCodeFormat,
      codeImageBase64: codeImageBase64,
      expiresAt: Self.dateInputToIso(formExpires),
      source: "share"
    )
    let client = ApiClient(baseUrl: apiBase, token: token)
    Task.detached(priority: .userInitiated) { [weak self] in
      guard let self else { return }
      do {
        let id = try await client.createCoupon(input: input)
        NSLog("[AURA-SHARE-TRACE] createCoupon success id=%@", id)
        await MainActor.run {
          self.setStage(.done)
          DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.completeRequest()
          }
        }
      } catch ApiError.unauthorized {
        await MainActor.run { self.setStage(.error("AURA에 다시 로그인해 주세요")) }
      } catch ApiError.serverError(let code, let body) {
        NSLog("[AURA-SHARE-TRACE] createCoupon server error %d %@", code, body ?? "")
        await MainActor.run { self.setStage(.error("저장 실패 (\(code))")) }
      } catch {
        NSLog("[AURA-SHARE-TRACE] createCoupon network error: %@", "\(error)")
        await MainActor.run { self.setStage(.error("네트워크 오류")) }
      }
    }
  }

  @objc private func onCancelTapped() {
    NSLog("[AURA-SHARE-TRACE] cancel tapped")
    completeRequest()
  }

  private func completeRequest() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }
}

// MARK: - Models

private struct CouponCandidate: Decodable {
  let brand: String?
  let title: String?
  let code: String?
  let codeFormat: String?
  let expiresAt: String?
  let confidence: Double
}

private struct CreateCouponInput: Encodable {
  let brand: String
  let title: String
  let code: String
  let codeFormat: String
  let codeImageBase64: String?
  let expiresAt: String?
  let source: String
}

// MARK: - API

private enum ApiError: Error {
  case unauthorized
  case network(String)
  case serverError(Int, String?)
}

private struct ApiClient {
  let baseUrl: String
  let token: String?

  func extract(rawText: String, language: String) async throws -> CouponCandidate {
    let body: [String: String] = ["rawText": rawText, "language": language]
    let bodyData = try JSONSerialization.data(withJSONObject: body)
    let data = try await postRaw(path: "/api/v1/wallet/coupons/extract-from-image-text", body: bodyData)
    struct Wrapper: Decodable { let candidate: CouponCandidate }
    return try JSONDecoder().decode(Wrapper.self, from: data).candidate
  }

  func createCoupon(input: CreateCouponInput) async throws -> String {
    // 백엔드는 camelCase 키를 받음 (RN 클라이언트와 동일). JSONEncoder 기본 strategy 사용.
    let bodyData = try JSONEncoder().encode(input)
    let data = try await postRaw(path: "/api/v1/wallet/coupons", body: bodyData)
    struct CouponMin: Decodable { let id: String }
    struct Wrapper: Decodable { let coupon: CouponMin }
    return try JSONDecoder().decode(Wrapper.self, from: data).coupon.id
  }

  private func postRaw(path: String, body: Data) async throws -> Data {
    let trimmedBase = baseUrl.hasSuffix("/") ? String(baseUrl.dropLast()) : baseUrl
    guard let url = URL(string: trimmedBase + path) else {
      throw ApiError.network("invalid url")
    }
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("no-cache, no-store, max-age=0", forHTTPHeaderField: "Cache-Control")
    if let token = token, !token.isEmpty {
      req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    req.httpBody = body
    req.timeoutInterval = 25

    let (data, response): (Data, URLResponse)
    do {
      (data, response) = try await URLSession.shared.data(for: req)
    } catch {
      throw ApiError.network("\(error)")
    }
    guard let http = response as? HTTPURLResponse else {
      throw ApiError.network("no http response")
    }
    if http.statusCode == 401 { throw ApiError.unauthorized }
    if (200..<300).contains(http.statusCode) {
      return data
    }
    let bodyStr = String(data: data, encoding: .utf8)
    throw ApiError.serverError(http.statusCode, bodyStr)
  }
}
