import { Location } from '../api/types';

export function hasMapPosition(location?: Location): location is Location & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof location?.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  );
}
