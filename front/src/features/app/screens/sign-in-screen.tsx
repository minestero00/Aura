import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { HeroGradient } from "@features/app/components/hero-gradient";

const AURA_ICON = require("@features/app/assets/aura-icon.png");

type SignInMode = "menu" | "phone" | "email";
type PhoneStep = "request" | "verify";

export interface SignInScreenProps {
  copy: AppCopy;
  errorMessage: string | null;
  isSubmitting: boolean;
  onGoogleSignIn: () => Promise<void>;
  onKakaoSignIn: () => Promise<void>;
  onPhoneRequestOtp: (phone: string) => Promise<void>;
  onPhoneVerifyOtp: (phone: string, token: string) => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
}

export function SignInScreen({
  copy,
  errorMessage,
  isSubmitting,
  onGoogleSignIn,
  onKakaoSignIn,
  onPhoneRequestOtp,
  onPhoneVerifyOtp,
  onEmailSignIn
}: SignInScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const [mode, setMode] = useState<SignInMode>("menu");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <HeroGradient style={styles.signInHero}>
            <View style={styles.signInHeroContent}>
              <View style={styles.signInHeroIconRow}>
                <Image source={AURA_ICON} style={styles.signInHeroIcon} resizeMode="contain" />
                <Text style={styles.signInHeroWordmark}>AURA</Text>
              </View>
              <Text
                style={styles.signInHeroTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {copy.signIn.title}
              </Text>
              <Text style={styles.signInHeroSubtitle} numberOfLines={2}>
                {copy.signIn.subtitle}
              </Text>
            </View>
          </HeroGradient>

          <View style={styles.formCard}>
            {mode === "menu" ? (
              <SignInMenu
                copy={copy}
                styles={styles}
                theme={theme}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
                onGoogleSignIn={onGoogleSignIn}
                onKakaoSignIn={onKakaoSignIn}
                onPickPhone={() => {
                  setMode("phone");
                  setPhoneStep("request");
                  setOtp("");
                }}
                onPickEmail={() => setMode("email")}
              />
            ) : null}

            {mode === "phone" ? (
              <PhoneSignIn
                copy={copy}
                styles={styles}
                theme={theme}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
                phone={phone}
                otp={otp}
                step={phoneStep}
                onChangePhone={setPhone}
                onChangeOtp={setOtp}
                onBack={() => {
                  setMode("menu");
                  setOtp("");
                }}
                onSubmitRequest={async () => {
                  await onPhoneRequestOtp(phone);
                  setPhoneStep("verify");
                }}
                onSubmitVerify={() => onPhoneVerifyOtp(phone, otp)}
              />
            ) : null}

            {mode === "email" ? (
              <EmailSignIn
                copy={copy}
                styles={styles}
                theme={theme}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
                email={email}
                password={password}
                onChangeEmail={setEmail}
                onChangePassword={setPassword}
                onBack={() => setMode("menu")}
                onSubmit={() => onEmailSignIn(email, password)}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Menu ─────────────────────────────────────────────────────────────────────
function SignInMenu({
  copy,
  styles,
  theme,
  isSubmitting,
  errorMessage,
  onGoogleSignIn,
  onKakaoSignIn,
  onPickPhone,
  onPickEmail
}: {
  copy: AppCopy;
  styles: ReturnType<typeof createAppStyles>;
  theme: ReturnType<typeof useAuraTheme>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onGoogleSignIn: () => Promise<void>;
  onKakaoSignIn: () => Promise<void>;
  onPickPhone: () => void;
  onPickEmail: () => void;
}) {
  return (
    <>
      <Text style={styles.inputLabel}>{copy.signIn.sectionTitle}</Text>
      <Text style={styles.helperText}>{copy.signIn.helper}</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={{ gap: 12, marginTop: 16 }}>
        <PrimaryButton
          label={copy.signIn.googleButton}
          background={theme.colors.surface}
          border={theme.colors.lineStrong}
          color={theme.colors.textPrimary}
          disabled={isSubmitting}
          onPress={() => void onGoogleSignIn()}
          leadingIcon={<GoogleIcon />}
        />
        <PrimaryButton
          label={copy.signIn.kakaoButton}
          background="#FEE500"
          color="#191600"
          disabled={isSubmitting}
          onPress={() => void onKakaoSignIn()}
          leadingIcon={<KakaoIcon />}
        />
        <PrimaryButton
          label={copy.signIn.phoneButton}
          background={theme.colors.accent}
          color={theme.colors.accentText}
          disabled={isSubmitting}
          onPress={onPickPhone}
          leadingIcon={<PhoneIcon />}
        />
        <View style={{ height: 1, backgroundColor: theme.colors.line, marginVertical: 8 }} />
        <Text style={styles.helperText}>{copy.signIn.dumbHint}</Text>
        <PrimaryButton
          label={copy.signIn.emailButton}
          background={theme.colors.surfaceMuted}
          color={theme.colors.textPrimary}
          border={theme.colors.lineStrong}
          disabled={isSubmitting}
          onPress={onPickEmail}
          leadingIcon={<EmailIcon />}
        />
      </View>

      {isSubmitting ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={theme.colors.textPrimary} />
          <Text style={styles.inlineLoadingText}>{copy.signIn.signingIn}</Text>
        </View>
      ) : null}
    </>
  );
}

// ── Phone OTP ────────────────────────────────────────────────────────────────
function PhoneSignIn({
  copy,
  styles,
  theme,
  isSubmitting,
  errorMessage,
  phone,
  otp,
  step,
  onChangePhone,
  onChangeOtp,
  onBack,
  onSubmitRequest,
  onSubmitVerify
}: {
  copy: AppCopy;
  styles: ReturnType<typeof createAppStyles>;
  theme: ReturnType<typeof useAuraTheme>;
  isSubmitting: boolean;
  errorMessage: string | null;
  phone: string;
  otp: string;
  step: PhoneStep;
  onChangePhone: (v: string) => void;
  onChangeOtp: (v: string) => void;
  onBack: () => void;
  onSubmitRequest: () => Promise<void>;
  onSubmitVerify: () => Promise<void>;
}) {
  return (
    <>
      <BackLink onPress={onBack} label={copy.signIn.back} color={theme.colors.textSecondary} />
      <Text style={styles.inputLabel}>{copy.signIn.phoneTitle}</Text>
      <Text style={styles.helperText}>{copy.signIn.phoneHelper}</Text>

      <TextInput
        value={phone}
        onChangeText={onChangePhone}
        editable={step === "request"}
        keyboardType="phone-pad"
        placeholder="010-1234-5678"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.textInput, { marginTop: 12 }]}
      />

      {step === "verify" ? (
        <TextInput
          value={otp}
          onChangeText={onChangeOtp}
          keyboardType="number-pad"
          maxLength={6}
          placeholder={copy.signIn.otpPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.textInput, { marginTop: 12, letterSpacing: 8, textAlign: "center" }]}
        />
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={{ marginTop: 16 }}>
        {step === "request" ? (
          <PrimaryButton
            label={copy.signIn.sendOtp}
            background={theme.colors.accent}
            color={theme.colors.accentText}
            disabled={isSubmitting || phone.length < 6}
            onPress={() => void onSubmitRequest()}
          />
        ) : (
          <PrimaryButton
            label={copy.signIn.verifyOtp}
            background={theme.colors.accent}
            color={theme.colors.accentText}
            disabled={isSubmitting || otp.length < 4}
            onPress={() => void onSubmitVerify()}
          />
        )}
      </View>

      {isSubmitting ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={theme.colors.textPrimary} />
        </View>
      ) : null}
    </>
  );
}

// ── Email + Password ─────────────────────────────────────────────────────────
function EmailSignIn({
  copy,
  styles,
  theme,
  isSubmitting,
  errorMessage,
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onBack,
  onSubmit
}: {
  copy: AppCopy;
  styles: ReturnType<typeof createAppStyles>;
  theme: ReturnType<typeof useAuraTheme>;
  isSubmitting: boolean;
  errorMessage: string | null;
  email: string;
  password: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <>
      <BackLink onPress={onBack} label={copy.signIn.back} color={theme.colors.textSecondary} />
      <Text style={styles.inputLabel}>{copy.signIn.emailTitle}</Text>
      <Text style={styles.helperText}>{copy.signIn.emailHelper}</Text>

      <TextInput
        value={email}
        onChangeText={onChangeEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.textInput, { marginTop: 12 }]}
      />
      <TextInput
        value={password}
        onChangeText={onChangePassword}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.textInput, { marginTop: 12 }]}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={{ marginTop: 16 }}>
        <PrimaryButton
          label={copy.signIn.signIn}
          background={theme.colors.accent}
          color={theme.colors.accentText}
          disabled={isSubmitting || !email || !password}
          onPress={() => void onSubmit()}
        />
      </View>

      {isSubmitting ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={theme.colors.textPrimary} />
        </View>
      ) : null}
    </>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
function PrimaryButton({
  label,
  background,
  color,
  border,
  disabled,
  onPress,
  leadingIcon
}: {
  label: string;
  background: string;
  color: string;
  border?: string;
  disabled?: boolean;
  onPress: () => void;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 12,
        backgroundColor: background,
        borderWidth: border ? 1 : 0,
        borderColor: border,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        gap: 10
      })}
    >
      {leadingIcon}
      <Text style={{ color, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

// ── Provider 로고 (의존성 없는 인라인 마크) ───────────────────────────────────
// react-native-svg 미사용 환경 대응 — View + Text 조합으로 인지 가능한 마크.
// 각 24×24 원형 컨테이너에 브랜드 색 + 식별자 글자/심볼.

function GoogleIcon() {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: "#4285F4", fontSize: 16, fontWeight: "800", lineHeight: 18 }}>G</Text>
    </View>
  );
}

function KakaoIcon() {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: "#191600",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: "#FEE500", fontSize: 13, fontWeight: "900", lineHeight: 14 }}>K</Text>
    </View>
  );
}

function PhoneIcon() {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 16 }}>✆</Text>
    </View>
  );
}

function EmailIcon() {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.06)",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: "#4A4E66", fontSize: 14, fontWeight: "700", lineHeight: 16 }}>@</Text>
    </View>
  );
}

function BackLink({
  onPress,
  label,
  color
}: {
  onPress: () => void;
  label: string;
  color: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: "flex-start", paddingVertical: 6 }}>
      <Text style={{ color, fontSize: 14, fontWeight: "500" }}>← {label}</Text>
    </Pressable>
  );
}
