import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { RequestsScreen } from '../screens/RequestsScreen';
import { VehiclesScreen } from '../screens/VehiclesScreen';
import { HomeStackParams } from './types';

export function BillsScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'Bills'>) {
  return <PaymentsScreen initialTab="bills" {...route.params} />;
}
export function DueScreen() {
  return <PaymentsScreen initialTab="bills" dueOnly />;
}
export function RequestedScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'Requested'>) {
  return <RequestsScreen section="Applications" targetId={route.params?.id} />;
}
export function ComplaintsScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'Complaints'>) {
  return <RequestsScreen section="Complaints" targetId={route.params?.id} />;
}
export function StopScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'StopRequests'>) {
  return <RequestsScreen section="Stop requests" targetId={route.params?.id} />;
}
export function FleetMapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParams, 'Vehicles'>>();
  return (
    <VehiclesScreen
      navigation={navigation}
      route={{ key: 'vehicle-map', name: 'Vehicles' }}
    />
  );
}
