import Foundation
import Vision
import UIKit
import React

/// On-device OCR — Phase J.3 Aura Wallet.
///
/// 카톡 기프티콘 이미지처럼 한국어+영어 텍스트가 섞인 이미지를 사용자 trigger로
/// 한 번 추출. raw text lines를 JS로 반환, 정형화(brand/title/expires)는 backend
/// LLM이 처리.
///
/// 모든 처리는 device-local — 이미지/텍스트가 외부 서버로 가지 않음.
/// 권한 불필요 (UIImage 로딩만).
@objc(AuraOCR)
class AuraOCR: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(extractText:resolver:rejecter:)
  func extractText(_ imagePath: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    let path = imagePath.hasPrefix("file://")
      ? String(imagePath.dropFirst("file://".count))
      : imagePath

    guard let image = UIImage(contentsOfFile: path), let cgImage = image.cgImage else {
      rejecter("OCR_INVALID_IMAGE", "Could not load image at path: \(path)", nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          rejecter("OCR_FAILED", error.localizedDescription, error)
          return
        }
        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        let lines = observations.compactMap { $0.topCandidates(1).first?.string }
        resolver([
          "lines": lines,
          "fullText": lines.joined(separator: "\n")
        ])
      }

      request.recognitionLevel = .accurate
      // iOS 16+에서 한국어 인식 지원. 미지원 OS에서는 자동으로 영어로 fallback.
      if #available(iOS 16.0, *) {
        request.recognitionLanguages = ["ko-KR", "en-US"]
      } else {
        request.recognitionLanguages = ["en-US"]
      }
      request.usesLanguageCorrection = true

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
      } catch {
        rejecter("OCR_PERFORM_FAILED", error.localizedDescription, error)
      }
    }
  }
}
