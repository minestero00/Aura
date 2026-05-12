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

  /// 이미지에서 바코드/QR 영역을 detect → 그 영역만 잘라 base64로 반환.
  /// 없으면 null 반환 (frontend가 원본 이미지로 fallback).
  /// 매장에서 점원이 화면 가득한 바코드를 바로 스캔할 수 있게 하기 위함.
  @objc(cropBarcode:resolver:rejecter:)
  func cropBarcode(_ imagePath: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    let path = imagePath.hasPrefix("file://")
      ? String(imagePath.dropFirst("file://".count))
      : imagePath

    guard let image = UIImage(contentsOfFile: path), let cgImage = image.cgImage else {
      rejecter("BARCODE_INVALID_IMAGE", "Could not load image at path: \(path)", nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      let request = VNDetectBarcodesRequest { request, error in
        if let error = error {
          rejecter("BARCODE_FAILED", error.localizedDescription, error)
          return
        }
        guard let results = request.results as? [VNBarcodeObservation],
              let first = results.first else {
          // 바코드 미발견 — null. frontend가 원본 이미지 fallback.
          resolver(NSNull())
          return
        }

        // Vision boundingBox는 정규화(0~1) + 좌하단 원점. UIImage는 좌상단 원점.
        // padding 5%로 약간 여유 두기.
        let bb = first.boundingBox
        let imgW = CGFloat(cgImage.width)
        let imgH = CGFloat(cgImage.height)
        let pad: CGFloat = 0.05
        let x = max(0, bb.minX - pad) * imgW
        let y = max(0, (1.0 - bb.maxY - pad)) * imgH
        let w = min(1, bb.width + 2 * pad) * imgW
        let h = min(1, bb.height + 2 * pad) * imgH
        let rect = CGRect(x: x, y: y, width: w, height: h)

        guard let cropped = cgImage.cropping(to: rect) else {
          resolver(NSNull())
          return
        }
        let uiCropped = UIImage(cgImage: cropped, scale: image.scale, orientation: image.imageOrientation)
        guard let data = uiCropped.pngData() else {
          resolver(NSNull())
          return
        }
        resolver([
          "base64": data.base64EncodedString(),
          "mime": "image/png"
        ])
      }

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      do {
        try handler.perform([request])
      } catch {
        rejecter("BARCODE_PERFORM_FAILED", error.localizedDescription, error)
      }
    }
  }

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
