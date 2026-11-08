// Holiday (November + December): Christmas red home, snow. The signs and sub-screens use a
// daytime winter sky, switching to a starry night sky from 6 PM until midnight.
import './theme.css';

// A snowflake: white dot with a faint blue-grey edge so it shows on light skies too.
const flake = (r) => `<circle r="${r}" fill="#fff" fill-opacity=".95" stroke="rgb(120,150,190)" stroke-opacity=".35" stroke-width=".7"/>`;

export default {
  daypart: { nightFrom: 18 },
  subTone: { day: 'light', night: 'dark' },
  garland: { shape: 'bulb', colors: ['#ff3b4e', '#ffd23f', '#39d97a', '#4fb3ff', '#FF6FA3'] },
  ground: 'snowbank',
  particles: [
    { sprites: [flake(2), flake(2.5)], size: 6, count: 11, dir: 'down', speed: 50, drift: 14 },
    { sprites: [flake(3.5), flake(3)], size: 8, count: 11, dir: 'down', speed: 51, drift: -18 },
    { sprites: [flake(5), flake(4.5)], size: 12, count: 10, dir: 'down', speed: 57, drift: 22 },
  ],
  // Bottom strip: white where the snowbank meets it, otherwise the sky's bottom colour.
  frame: {
    day: { home: '#FFFFFF', night: '#FFFFFF', day: '#FFFFFF', picker: '#7d0a1c', sub: '#f4f9fe' },
    night: { home: '#FFFFFF', night: '#FFFFFF', day: '#FFFFFF', picker: '#7d0a1c', sub: '#1d3a6e' },
  },
};
