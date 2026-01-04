// Type declarations for Expo modules without bundled types

declare module "expo-splash-screen" {
  export function preventAutoHideAsync(): Promise<boolean>;
  export function hideAsync(): Promise<boolean>;
}

declare module "expo-haptics" {
  export enum ImpactFeedbackStyle {
    Light = "light",
    Medium = "medium",
    Heavy = "heavy",
    Soft = "soft",
    Rigid = "rigid",
  }

  export enum NotificationFeedbackType {
    Success = "success",
    Warning = "warning",
    Error = "error",
  }

  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(
    type?: NotificationFeedbackType,
  ): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module "expo-constants" {
  interface Manifest {
    name?: string;
    slug?: string;
    version?: string;
    orientation?: string;
    icon?: string;
    splash?: object;
    updates?: object;
    assetBundlePatterns?: string[];
    ios?: object;
    android?: object;
    web?: object;
    extra?: Record<string, unknown>;
    hostUri?: string;
    debuggerHost?: string;
  }

  interface Constants {
    expoConfig?: Manifest | null;
    manifest?: Manifest | null;
    manifest2?: object | null;
    expoGoConfig?: object | null;
    easConfig?: object | null;
    appOwnership?: "standalone" | "expo" | "guest" | null;
    executionEnvironment?: string;
    installationId?: string;
    isHeadless?: boolean;
    platform?: { ios?: object; android?: object; web?: object };
    sessionId?: string;
    statusBarHeight?: number;
    systemFonts?: string[];
    deviceName?: string;
    deviceYearClass?: number | null;
    isDevice?: boolean;
    nativeAppVersion?: string | null;
    nativeBuildVersion?: string | null;
  }

  const Constants: Constants;
  export default Constants;
}

declare module "expo-brightness" {
  export enum BrightnessMode {
    UNKNOWN = 0,
    AUTOMATIC = 1,
    MANUAL = 2,
  }

  export function getBrightnessAsync(): Promise<number>;
  export function setBrightnessAsync(brightness: number): Promise<void>;
  export function getSystemBrightnessAsync(): Promise<number>;
  export function setSystemBrightnessAsync(brightness: number): Promise<void>;
  export function useSystemBrightnessAsync(): Promise<void>;
  export function isUsingSystemBrightnessAsync(): Promise<boolean>;
  export function getSystemBrightnessModeAsync(): Promise<BrightnessMode>;
  export function setSystemBrightnessModeAsync(
    mode: BrightnessMode,
  ): Promise<void>;
  export function requestPermissionsAsync(): Promise<{
    status: string;
    granted: boolean;
  }>;
  export function getPermissionsAsync(): Promise<{
    status: string;
    granted: boolean;
  }>;
}

declare module "expo-keep-awake" {
  export function activateKeepAwake(tag?: string): void;
  export function deactivateKeepAwake(tag?: string): void;
  export function activateKeepAwakeAsync(tag?: string): Promise<void>;
  export function deactivateKeepAwakeAsync(tag?: string): Promise<void>;
  export function useKeepAwake(tag?: string): void;
  export function isAvailableAsync(): Promise<boolean>;
}

declare module "expo-blur" {
  import { ViewProps } from "react-native";

  export type BlurTint =
    | "light"
    | "dark"
    | "default"
    | "extraLight"
    | "regular"
    | "prominent"
    | "systemUltraThinMaterial"
    | "systemThinMaterial"
    | "systemMaterial"
    | "systemThickMaterial"
    | "systemChromeMaterial"
    | "systemUltraThinMaterialLight"
    | "systemThinMaterialLight"
    | "systemMaterialLight"
    | "systemThickMaterialLight"
    | "systemChromeMaterialLight"
    | "systemUltraThinMaterialDark"
    | "systemThinMaterialDark"
    | "systemMaterialDark"
    | "systemThickMaterialDark"
    | "systemChromeMaterialDark";

  export interface BlurViewProps extends ViewProps {
    tint?: BlurTint;
    intensity?: number;
    blurReductionFactor?: number;
    experimentalBlurMethod?: "none" | "dimezisBlurView";
  }

  export const BlurView: React.FC<BlurViewProps>;
  export default BlurView;
}

declare module "expo-sharing" {
  export interface SharingOptions {
    mimeType?: string;
    dialogTitle?: string;
    UTI?: string;
  }

  export function shareAsync(
    url: string,
    options?: SharingOptions,
  ): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}

declare module "expo-image" {
  import { ViewProps } from "react-native";

  export type ImageContentFit =
    | "cover"
    | "contain"
    | "fill"
    | "none"
    | "scale-down";
  export type ImageContentPosition =
    | "center"
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top center"
    | "top right"
    | "top left"
    | "right center"
    | "bottom center"
    | "bottom right"
    | "bottom left"
    | "left center";

  export interface ImageSource {
    uri?: string;
    width?: number;
    height?: number;
    headers?: Record<string, string>;
    cacheKey?: string;
  }

  export interface ImageProps extends ViewProps {
    source?: ImageSource | ImageSource[] | string | number | null;
    placeholder?: ImageSource | string | number | null;
    contentFit?: ImageContentFit;
    contentPosition?: ImageContentPosition;
    transition?: number | null;
    blurRadius?: number;
    tintColor?: string;
    cachePolicy?: "none" | "disk" | "memory" | "memory-disk";
    recyclingKey?: string;
    onLoadStart?: () => void;
    onLoad?: (event: {
      source: { width: number; height: number; url: string };
    }) => void;
    onLoadEnd?: () => void;
    onError?: (event: { error: string }) => void;
  }

  export const Image: React.FC<ImageProps>;
  export default Image;
}
