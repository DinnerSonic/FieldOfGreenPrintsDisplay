// Halloween (October): purple night with a moon, orange/purple/green lights, fog, falling leaves.
import './theme.css';

// An autumn leaf with a centre vein.
const leaf = (rot, s, c) => `<g transform="rotate(${rot}) scale(${s})">`
  + `<path d="M0-10C7-6 7 5 0 10-7 5-7-6 0-10Z" fill="${c}"/>`
  + `<path d="M0-10V12" stroke="rgb(80,30,0)" stroke-opacity=".45" stroke-width="1"/></g>`;

export default {
  subTone: 'dark',
  garland: { shape: 'bulb', colors: ['#ff8a1f', '#a259ff', '#6dff7a', '#ffcf3f'] },
  ground: 'fog',
  particles: [
    { sprites: [leaf(20, 0.9, '#ff8a1f'), leaf(-35, 0.8, '#ffb347')], size: 24, count: 7, dir: 'down', speed: 39, drift: 40 },
    { sprites: [leaf(60, 1.2, '#d9480f'), leaf(-10, 1.1, '#ff8a1f')], size: 30, count: 5, dir: 'down', speed: 40, drift: -46 },
    { sprites: [leaf(-50, 1.5, '#ffb347')], size: 36, count: 3, dir: 'down', speed: 41, drift: 52 },
  ],
  // Bottom strip: the fog's colour where it meets the edge, otherwise the background's.
  frame: { home: '#9f95b4', night: '#ab9bc7', day: '#e5daeb', picker: '#12071f', sub: '#341a57' },
};
