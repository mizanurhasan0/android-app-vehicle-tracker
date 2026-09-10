import { NativeModules, Platform } from 'react-native';

/** Uses Android's system picker; no broad storage permission is requested. */
export async function pickStudentPhoto(): Promise<string | null> {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia?.pickPhoto)
    throw new Error('ছবি নির্বাচন করতে আপডেট করা Android অ্যাপ ব্যবহার করুন।');
  return NativeModules.NoorMedia.pickPhoto();
}

/** Exports are written to the user's selected document location via Android SAF. */
export async function saveReportFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia?.saveDocument)
    throw new Error('ফাইল সংরক্ষণ করতে আপডেট করা Android অ্যাপ ব্যবহার করুন।');
  return NativeModules.NoorMedia.saveDocument(filename, content, mimeType);
}
