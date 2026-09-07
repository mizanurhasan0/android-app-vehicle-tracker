import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParams = {
  Fleet: undefined;
  VehicleHistory: { imei: string; name: string };
};

export type RootTabParams = {
  Home: NavigatorScreenParams<HomeStackParams> | undefined;
  Bills: undefined;
  Requests: undefined;
  Setup: undefined;
  Inbox: undefined;
};
