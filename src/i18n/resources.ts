import enFeedback from './en.feedback.json';
import bnFeedback from './bn.feedback.json';
import en from './en.json';
import bn from './bn.json';
import enAdmin from './en.admin.json';
import bnAdmin from './bn.admin.json';
import enOffice from './en.office.json';
import bnOffice from './bn.office.json';
import enParent from './en.parent.json';
import bnParent from './bn.parent.json';
import enFleet from './en.fleet.json';
import bnFleet from './bn.fleet.json';

export const catalogs = {
  feedback: { en: enFeedback, bn: bnFeedback },
  common: { en, bn },
  admin: { en: enAdmin, bn: bnAdmin },
  office: { en: enOffice, bn: bnOffice },
  parent: { en: enParent, bn: bnParent },
  fleet: { en: enFleet, bn: bnFleet },
};

export const english: Record<string, string> = Object.assign(
  {},
  ...Object.values(catalogs).map(catalog => catalog.en),
);
export const bangla: Record<string, string> = Object.assign(
  {},
  ...Object.values(catalogs).map(catalog => catalog.bn),
);
