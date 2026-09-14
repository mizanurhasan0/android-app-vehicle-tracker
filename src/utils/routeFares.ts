import { Route } from '../api/types';

export function journeyFare(
  route: Route | undefined,
  boardingStopId: string,
  dropoffStopId: string,
) {
  if (!route) return undefined;
  if (!dropoffStopId) return route.monthlyAmount;
  return route.fares?.find(
    fare =>
      fare.boardingStopId === boardingStopId &&
      fare.dropoffStopId === dropoffStopId,
  )?.monthlyAmount;
}

export function journeyDestinations(
  route: Route | undefined,
  boardingStopId: string,
) {
  return (route?.stops || []).filter(stop =>
    route?.fares?.some(
      fare =>
        fare.boardingStopId === boardingStopId &&
        fare.dropoffStopId === stop.id,
    ),
  );
}
