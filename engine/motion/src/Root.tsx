import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {ShotComp, ShotProps} from './Shot';

// One composition renders any motion shot; vg.py passes the shot from build/<id>/timeline.json as input props.
const sample: ShotProps = {
  pid: 'demo', fps: 30, f0: 0, frames: 120, words: [],
  shot: {id: 'demo', start: 0, end: 4, motion: {palette: 'night', blocks: [
    {type: 'kicker', text: 'TTStory · motion', at: 0.2},
    {type: 'title', text: 'Графика **без координат**', at: 0.5},
    {type: 'number', value: 70, suffix: '%', label: 'информации достаточно', at: 1.2},
  ]}},
};

export const Root: React.FC = () => (
  <Composition id="Shot" component={ShotComp as any} width={1080} height={1920} fps={30} durationInFrames={120} defaultProps={sample as any}
    calculateMetadata={({props}: any) => ({durationInFrames: Math.max(1, props.frames ?? 120), fps: props.fps ?? 30})} />
);
