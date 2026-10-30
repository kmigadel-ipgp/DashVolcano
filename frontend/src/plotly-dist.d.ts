// The prebuilt Plotly bundle used by react-plotly.js (same instance, no extra download)
declare module 'plotly.js/dist/plotly' {
  import * as Plotly from 'plotly.js';
  export default Plotly;
}
