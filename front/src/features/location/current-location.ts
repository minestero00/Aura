import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid, Platform } from "react-native";

export interface DeviceLocation {
  lat: number;
  lng: number;
}

async function requestAndroidLocationPermission() {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureLocationPermission() {
  if (Platform.OS === "android") {
    return requestAndroidLocationPermission();
  }

  return new Promise(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false)
    );
  });
}

export async function getCurrentDeviceLocation(): Promise<DeviceLocation | null> {
  const granted = await ensureLocationPermission();
  if (!granted) {
    return null;
  }

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        resolve(null);
      },
      {
        timeout: 8_000,
        enableHighAccuracy: false,
        maximumAge: 60_000
      }
    );
  });
}
