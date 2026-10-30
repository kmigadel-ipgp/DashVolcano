import { CanvasContext } from '@luma.gl/core';

/**
 * Work around a luma.gl 9.2 bug (still present in 9.2.6).
 *
 * When deck.gl creates a device on a canvas that already has one (React
 * StrictMode mounts each map twice on the same canvas), luma.gl reuses the
 * existing device and drops the new, half-built one. The dropped device's
 * CanvasContext keeps its ResizeObserver, which then throws
 * "Cannot read properties of undefined (reading 'maxTextureDimension2D')".
 *
 * The orphaned context is skipped: the device actually in use observes the
 * same canvas and handles the resize itself.
 */
type ResizeHandler = (this: CanvasContext, entries: ResizeObserverEntry[]) => void;
const prototype = CanvasContext.prototype as unknown as { _handleResize: ResizeHandler };
const handleResize = prototype._handleResize;

prototype._handleResize = function (this: CanvasContext, entries: ResizeObserverEntry[]) {
  if (!this.device?.limits) return;
  handleResize.call(this, entries);
};
