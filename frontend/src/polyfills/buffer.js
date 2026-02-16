// Empty buffer polyfill stub
export const Buffer = globalThis.Buffer || class Buffer {
  static from() { return new Uint8Array(); }
  static isBuffer() { return false; }
};
export default Buffer;
