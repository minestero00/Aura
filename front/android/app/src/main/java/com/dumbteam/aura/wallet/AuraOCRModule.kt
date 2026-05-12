package com.dumbteam.aura.wallet

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

/**
 * On-device OCR — Phase J.3 Aura Wallet.
 *
 * 한국어/영어 텍스트가 섞인 카톡 기프티콘 이미지 등에서 raw text를 추출.
 * 정형화(brand/title/expires)는 backend LLM(J.3.d)에서 처리.
 *
 * 모든 처리는 device-local — 이미지/텍스트가 외부 서버로 안 감.
 * ML Kit Korean model은 첫 사용 시 자동 다운로드 (앱 크기에 정적 포함 X).
 */
class AuraOCRModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "AuraOCR"

  @ReactMethod
  fun extractText(imagePath: String, promise: Promise) {
    val uri = try {
      Uri.parse(if (imagePath.startsWith("/")) "file://$imagePath" else imagePath)
    } catch (e: Exception) {
      promise.reject("OCR_INVALID_URI", "Could not parse imagePath: $imagePath", e)
      return
    }

    val image = try {
      InputImage.fromFilePath(ctx, uri)
    } catch (e: Exception) {
      promise.reject("OCR_INVALID_IMAGE", "Could not load image: ${e.message}", e)
      return
    }

    val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    recognizer.process(image)
      .addOnSuccessListener { result ->
        val lines = mutableListOf<String>()
        for (block in result.textBlocks) {
          for (line in block.lines) {
            val text = line.text.trim()
            if (text.isNotEmpty()) {
              lines.add(text)
            }
          }
        }
        val map = Arguments.createMap()
        val arr = Arguments.createArray()
        lines.forEach { arr.pushString(it) }
        map.putArray("lines", arr)
        map.putString("fullText", lines.joinToString("\n"))
        promise.resolve(map)
      }
      .addOnFailureListener { e ->
        promise.reject("OCR_FAILED", e.message, e)
      }
  }
}
