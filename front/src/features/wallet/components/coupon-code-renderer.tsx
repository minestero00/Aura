import React from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuraTheme } from "@features/app/styles";
import type { CodeFormat } from "@features/wallet/types";

interface Props {
  code: string;
  codeFormat: CodeFormat;
  /** QR 한 변 px. 기본 220. */
  size?: number;
}

/**
 * 풀스크린 표시용 — QR 형식이면 SVG, 텍스트/바코드 형식이면 큰 글씨.
 * 바코드 형식(EAN-13/Code-128)은 추후 dedicated barcode SVG 라이브러리 도입 후 분기.
 */
export function CouponCodeRenderer({ code, codeFormat, size = 220 }: Props) {
  const theme = useAuraTheme();

  if (codeFormat === "barcode_qr") {
    return (
      <View style={styles.qrWrap}>
        <QRCode value={code} size={size} backgroundColor="#FFFFFF" color="#000000" />
      </View>
    );
  }

  // text_only / barcode_ean13 / barcode_code128 / barcode_other — 우선 큰 텍스트.
  // 카운터에서 점원이 직접 입력하거나 사용자가 다른 앱(POS 스캐너)에 보여줄 때 사용.
  return (
    <Text style={[styles.textCode, { color: theme.colors.textPrimary }]} selectable>
      {code}
    </Text>
  );
}

const styles = StyleSheet.create({
  qrWrap: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  textCode: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2.5,
    textAlign: "center"
  }
});
