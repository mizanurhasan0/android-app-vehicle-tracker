import React from 'react';
import { ToastKind, ToastMessage } from '../Toast';

export function Notice({
  text,
  kind = 'success',
}: {
  text?: string;
  kind?: ToastKind;
}) {
  return <ToastMessage message={text} kind={kind} />;
}
