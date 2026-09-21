import { NativeModules, Platform } from 'react-native';

/** Uses Android's system picker; no broad storage permission is requested. */
export async function pickStudentPhoto(): Promise<string | null> {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia?.pickPhoto)
    throw new Error('Use the updated Android app to select a photo.');
  return NativeModules.NoorMedia.pickPhoto();
}

/** Preserve readable QR codes and receipt text at up to 1280 pixels. */
export async function pickPaymentPhoto(): Promise<string | null> {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia?.pickPaymentPhoto)
    throw new Error('Use the updated Android app to select a photo.');
  return NativeModules.NoorMedia.pickPaymentPhoto();
}

/** Exports are written to the user's selected document location via Android SAF. */
export async function saveReportFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia?.saveDocument)
    throw new Error('Use the updated Android app to save files.');
  return NativeModules.NoorMedia.saveDocument(filename, content, mimeType);
}
