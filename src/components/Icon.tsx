import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from './icons';
import {
  ArrowLeft,
  Bell,
  Bus,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  FilePlus,
  FileText,
  Flag,
  GraduationCap,
  Gauge,
  House,
  Info,
  LocateFixed,
  LockKeyhole,
  LogOut,
  Mail,
  Maximize2,
  MapPin,
  Menu,
  Minus,
  Phone,
  Pencil,
  Plus,
  ReceiptText,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
  Wrench,
  X,
} from './icons';
import { colors } from '../theme';

export type IconName =
  | 'student' | 'students' | 'driver' | 'drivers' | 'vehicle' | 'vehicles' | 'bus'
  | 'trip' | 'route' | 'routes' | 'payment' | 'payments' | 'wallet' | 'income'
  | 'expense' | 'investment' | 'money' | 'school' | 'notice' | 'bell'
  | 'notification' | 'notifications' | 'request' | 'requests' | 'admission'
  | 'report' | 'reports' | 'receipt' | 'document' | 'bills' | 'due' | 'user'
  | 'profile' | 'lock' | 'eye' | 'back' | 'attendance' | 'calendar' | 'history'
  | 'clock' | 'maintenance' | 'fuel' | 'mobile' | 'address' | 'emergency'
  | 'odometer' | 'duration'
  | 'dropoff' | 'location' | 'pin' | 'phone' | 'call' | 'contact'
  | 'communication' | 'whatsapp' | 'sms' | 'mail' | 'settings' | 'more'
  | 'menu' | 'plus' | 'add' | 'minus' | 'close' | 'check' | 'info' | 'search'
  | 'edit' | 'chevron' | 'chevronLeft' | 'download' | 'logout' | 'shield' | 'home'
  | 'fit' | 'locate';

const icons: Record<IconName, LucideIcon> = {
  student: GraduationCap, students: GraduationCap, driver: UserRound, drivers: UserRound,
  vehicle: Bus, vehicles: Bus, bus: Bus, trip: Route, route: Route, routes: Route,
  payment: Wallet, payments: Wallet, wallet: Wallet, income: Wallet, expense: Wallet,
  investment: Wallet, money: Wallet, school: GraduationCap, notice: Bell, bell: Bell,
  notification: Bell, notifications: Bell, request: FilePlus, requests: FilePlus,
  admission: FilePlus, report: ReceiptText, reports: ReceiptText, receipt: ReceiptText,
  document: FileText, bills: ReceiptText, due: Clock3, user: UserRound, profile: UserRound,
  lock: LockKeyhole, eye: Eye, back: ArrowLeft, attendance: CalendarDays,
  calendar: CalendarDays, history: Clock3, clock: Clock3, maintenance: Wrench, fuel: Wallet,
  odometer: Gauge, duration: Clock3,
  mobile: Smartphone, address: House, emergency: CircleAlert, dropoff: Flag,
  location: MapPin, pin: MapPin, phone: Phone, call: Phone, contact: Phone,
  communication: Phone, whatsapp: Phone, sms: Mail, mail: Mail, settings: Settings,
  more: Menu, menu: Menu, plus: Plus, add: Plus, minus: Minus, close: X, check: Check,
  info: Info, search: Search,
  edit: Pencil, chevron: ChevronRight, chevronLeft: ChevronLeft, download: Download, logout: LogOut,
  shield: ShieldCheck, home: House, fit: Maximize2, locate: LocateFixed,
};

export function Icon({
  name,
  size = 24,
  color = colors.primary,
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Glyph = icons[name as IconName] || CircleHelp;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { width: size, height: size }]}
    >
      <Glyph size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}

export const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
