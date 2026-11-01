// Holiday (November + December): Christmas red home, snow. The signs and sub-screens use a
// daytime winter sky, switching to a starry night sky from 6 PM until midnight.
import './theme.css';

// A snowflake: white dot with a faint blue-grey edge so it shows on light skies too.
const flake = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".95" stroke="rgb(120,150,190)" stroke-opacity=".35" stroke-width=".7"/>`;

export default {
  daypart: { nightFrom: 18 },
  subTone: { day: 'light', night: 'dark' },
  garland: { shape: 'bulb', colors: ['#ff3b4e', '#ffd23f', '#39d97a', '#4fb3ff', '#FF6FA3'] },
  ground: 'snowbank',
  particles: [
    { tile: [260, 300], dir: 'down', dur: 18, drift: 14, shapes: flake(30, 40, 2) + flake(150, 110, 2.5) + flake(90, 210, 2) + flake(220, 260, 2.5) },
    { tile: [310, 340], dir: 'down', dur: 20, drift: -18, shapes: flake(60, 70, 3.5) + flake(240, 180, 3) + flake(140, 300, 3.5) },
    { tile: [380, 420], dir: 'down', dur: 22, drift: 22, shapes: flake(100, 120, 5) + flake(300, 330, 4.5) },
  ],
  // Bottom strip: white where the snowbank meets it, otherwise the sky's bottom colour.
  frame: {
    day: { home: '#FFFFFF', night: '#FFFFFF', day: '#FFFFFF', picker: '#7d0a1c', sub: '#f4f9fe' },
    night: { home: '#FFFFFF', night: '#FFFFFF', day: '#FFFFFF', picker: '#7d0a1c', sub: '#1d3a6e' },
  },
};
