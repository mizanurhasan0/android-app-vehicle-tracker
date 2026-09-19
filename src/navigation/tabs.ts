import { HomeStackParams } from './types';

// A tab must be navigable without route parameters.
type TabRouteName = {
  [Name in keyof HomeStackParams]: undefined extends HomeStackParams[Name]
    ? Name
    : never;
}[keyof HomeStackParams];

type TabDefinition = readonly [name: TabRouteName, title: string, icon: string];

export const adminTabs = [
  ['Fleet', 'Home', 'home'],
  ['Vehicles', 'Vehicles', 'vehicle'],
  ['Students', 'Students', 'students'],
  ['Bills', 'Payment', 'payment'],
  ['More', 'Menu', 'menu'],
] as const satisfies readonly TabDefinition[];
export const parentTabs = [
  ['Fleet', 'Home', 'home'],
  ['TodayJourney', 'Trip', 'vehicle'],
  ['Bills', 'Payment', 'payment'],
  ['Inbox', 'Notice', 'bell'],
  ['More', 'More', 'more'],
] as const satisfies readonly TabDefinition[];

export type TabName = (typeof adminTabs | typeof parentTabs)[number][0];
export type NavigationTab = readonly [
  name: TabName,
  title: string,
  icon: string,
];
