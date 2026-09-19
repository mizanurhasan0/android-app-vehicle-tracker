import React from 'react';
import {
  Bus, Compass, Gauge, Layers, LockKeyhole, Play, Route, Share2, Target, Wrench,
} from './icons';

export type TrackingIconName =
  | 'target' | 'layers' | 'traffic' | 'play' | 'compass'
  | 'share' | 'lock' | 'route' | 'engine' | 'speed';

export function TrackingIcon({
  name,
  size = 24,
  color = '#006B47',
}: {
  name: TrackingIconName;
  size?: number;
  color?: string;
}) {
  const Glyph =
    name === 'target' ? Target : name === 'layers' ? Layers : name === 'traffic' ? Bus :
      name === 'play' ? Play : name === 'compass' ? Compass : name === 'share' ? Share2 :
        name === 'lock' ? LockKeyhole : name === 'route' ? Route : name === 'engine' ? Wrench : Gauge;
  return <Glyph size={size} color={color} strokeWidth={1.8} />;
}
