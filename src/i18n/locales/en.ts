import { common } from './en/common';
import { engine } from './en/engine';
import { beyond, ceremony, collection, story, welcome, welcomeBack } from './en/journey';
import { insights } from './en/insights';
import { journeyTab } from './en/journeyTab';
import { nav, reflection } from './en/nav';
import { settings } from './en/settings';
import { add, setup, weekly } from './en/setup';
import { today } from './en/today';
import { progress, reminders } from './en/progress';

/** English: Schwung's source language. Every other catalog mirrors this shape (i18n/index.ts). */
export const en = {
  common,
  engine,
  progress,
  reminders,
  nav,
  reflection,
  settings,
  collection,
  welcomeBack,
  story,
  welcome,
  beyond,
  today,
  journeyTab,
  insights,
  setup,
  add,
  weekly,
  ceremony,
};
