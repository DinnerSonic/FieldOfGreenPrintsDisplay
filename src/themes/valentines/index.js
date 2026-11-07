// Valentine's (February): deep rose home, a garland of hearts, hearts drifting upward.
import './theme.css';

const heart = (s, c) => `<path transform="scale(${s})" d="M0 7C-9 1-10-6-5-8-2-9 0-7 0-5 0-7 2-9 5-8 10-6 9 1 0 7Z"`
  + ` fill="${c}" fill-opacity=".9" stroke="rgb(140,20,60)" stroke-opacity=".25" stroke-width="1"/>`;

export default {
  subTone: 'light',
  garland: { shape: 'heart', colors: ['#ff3b5c', '#ffb3cf', '#ffffff', '#ff6fa3'] },
  ground: null,
  particles: [
    { sprites: [heart(0.9, '#ffb3cf'), heart(0.8, '#ffffff')], size: 20, count: 7, dir: 'up', speed: 44, drift: 16 },
    { sprites: [heart(1.2, '#ff6fa3'), heart(1.1, '#ff3b5c')], size: 26, count: 5, dir: 'up', speed: 44, drift: -20 },
    { sprites: [heart(1.6, '#ffb3cf')], size: 34, count: 3, dir: 'up', speed: 44, drift: 24 },
  ],
  // Bottom strip: each background's bottom colour (no ground decoration).
  frame: { home: '#7a0f3a', night: '#6a1548', day: '#fff3f8', picker: '#7a0f3a', sub: '#fff0f5' },
};
