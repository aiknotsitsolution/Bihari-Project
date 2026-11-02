import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const canSecure = Platform.OS !== "web";

/** Tokens: Keychain / Keystore (localStorage ki jagah) */
export const secureGet = async (key: string): Promise<string | null> =>
  canSecure ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);

export const secureSet = async (key: string, value: string): Promise<void> => {
  if (canSecure) await SecureStore.setItemAsync(key, value);
  else await AsyncStorage.setItem(key, value);
};

export const secureRemove = async (key: string): Promise<void> => {
  if (canSecure) await SecureStore.deleteItemAsync(key);
  else await AsyncStorage.removeItem(key);
};

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const setJson = (key: string, value: unknown): Promise<void> =>
  AsyncStorage.setItem(key, JSON.stringify(value));

export const removeKey = (key: string): Promise<void> =>
  AsyncStorage.removeItem(key);
