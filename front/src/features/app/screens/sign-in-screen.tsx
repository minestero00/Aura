import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { SvgXml } from "react-native-svg";
import { auraMotion, createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { HeroGradient } from "@features/app/components/hero-gradient";
import { ScreenAtmosphere } from "@features/app/components/screen-atmosphere";

const AURA_ICON = require("@features/app/assets/aura-icon.png");
const DUMB_LOGO = require("@features/app/assets/dumb-logo.jpg");

// 공식 Google G 로고(멀티컬러) — Google branding guide의 4-arc 형태
const GOOGLE_G_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
</svg>`;

// KakaoTalk speech bubble — 공식 마크와 동일 형태(검정 채우기, 컨테이너의 노랑이 배경)
const KAKAO_BUBBLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.91 1.96 5.45 4.84 6.84L5.5 21l4.36-2.86c.7.1 1.41.16 2.14.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" fill="#191600"/>
</svg>`;

// 휴대전화 글리프
const PHONE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#FFFFFF"/>
</svg>`;

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

  // Screen entrance — top hero slides down, bottom form slides up (staggered).
  // Spec: aura-app-design-system/references/patterns.md "화면 진입 모션".
  const heroTranslate = useRef(new Animated.Value(-auraMotion.enter.topCardDistance)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(auraMotion.enter.bottomCardDistance)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enterTrack = (translate: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(translate, {
          toValue: 0,
          duration: auraMotion.duration.slow,
          easing: auraMotion.easing.standard,
          delay,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: auraMotion.duration.slow,
          easing: auraMotion.easing.standard,
          delay,
          useNativeDriver: true
        })
      ]);

    Animated.parallel([
      enterTrack(heroTranslate, heroOpacity, 0),
      enterTrack(formTranslate, formOpacity, auraMotion.enter.stagger)
    ]).start();
  }, [heroTranslate, heroOpacity, formTranslate, formOpacity]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenAtmosphere />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: heroOpacity,
              transform: [{ translateY: heroTranslate }]
            }}
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
          </Animated.View>

          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslate }]
              }
            ]}
          >
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
          </Animated.View>
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
          leadingIcon={<DumbIcon />}
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

// ── Provider 로고 (공식 마크) ────────────────────────────────────────────────
// Google: 4-arc multicolor G (Google branding guide).
// Kakao: 검정 speech bubble (배경 노랑이 컨테이너에서 채움).
// Phone: 시스템 phone 글리프.
// Dumb: image/dumbicon/dumb_logo.svg에서 추출한 raster.

function GoogleIcon() {
  return <SvgXml xml={GOOGLE_G_SVG} width={22} height={22} />;
}

function KakaoIcon() {
  return <SvgXml xml={KAKAO_BUBBLE_SVG} width={22} height={22} />;
}

function PhoneIcon() {
  return <SvgXml xml={PHONE_SVG} width={22} height={22} />;
}

function DumbIcon() {
  return (
    <Image
      source={DUMB_LOGO}
      style={{ width: 22, height: 22, borderRadius: 6 }}
      resizeMode="cover"
    />
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
