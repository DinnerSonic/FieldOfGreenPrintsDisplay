// Halloween (October): purple night with a moon, orange/purple/green lights, fog, falling leaves.
import './theme.css';

// An autumn leaf with a centre vein.
const leaf = (x, y, rot, s, c) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">`
  + `<path d="M0-10C7-6 7 5 0 10-7 5-7-6 0-10Z" fill="${c}"/>`
  + `<path d="M0-10V12" stroke="rgb(80,30,0)" stroke-opacity=".45" stroke-width="1"/></g>`;

export default {
  subTone: 'dark',
  garland: { shape: 'bulb', colors: ['#ff8a1f', '#a259ff', '#6dff7a', '#ffcf3f'] },
  ground: 'fog',
  particles: [
    { tile: [300, 340], dir: 'down', dur: 26, drift: 40, shapes: leaf(40, 60, 20, 0.9, '#ff8a1f') + leaf(200, 220, -35, 0.8, '#ffb347') },
    { tile: [360, 400], dir: 'down', dur: 30, drift: -46, shapes: leaf(90, 90, 60, 1.2, '#d9480f') + leaf(280, 300, -10, 1.1, '#ff8a1f') },
    { tile: [420, 460], dir: 'down', dur: 34, drift: 52, shapes: leaf(150, 140, -50, 1.5, '#ffb347') },
  ],
  // Bottom strip: the fog's colour where it meets the edge, otherwise the background's.
  frame: { home: '#9f95b4', night: '#ab9bc7', day: '#e5daeb', picker: '#12071f', sub: '#341a57' },
};
