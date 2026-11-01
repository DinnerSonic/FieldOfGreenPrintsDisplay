// Valentine's (February): deep rose home, a garland of hearts, hearts drifting upward.
import './theme.css';

const heart = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 7C-9 1-10-6-5-8-2-9 0-7 0-5 0-7 2-9 5-8 10-6 9 1 0 7Z"`
  + ` fill="${c}" fill-opacity=".9" stroke="rgb(140,20,60)" stroke-opacity=".25" stroke-width="1"/>`;

export default {
  subTone: 'light',
  garland: { shape: 'heart', colors: ['#ff3b5c', '#ffb3cf', '#ffffff', '#ff6fa3'] },
  ground: null,
  particles: [
    { tile: [280, 320], dir: 'up', dur: 22, drift: 16, shapes: heart(40, 60, 0.9, '#ffb3cf') + heart(200, 230, 0.8, '#ffffff') },
    { tile: [340, 380], dir: 'up', dur: 26, drift: -20, shapes: heart(90, 100, 1.2, '#ff6fa3') + heart(260, 290, 1.1, '#ff3b5c') },
    { tile: [400, 440], dir: 'up', dur: 30, drift: 24, shapes: heart(160, 160, 1.6, '#ffb3cf') },
  ],
  // Bottom strip: each background's bottom colour (no ground decoration).
  frame: { home: '#7a0f3a', night: '#6a1548', day: '#fff3f8', picker: '#7a0f3a', sub: '#fff0f5' },
};
