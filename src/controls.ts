import { Chunkloader } from './chunkloader';
import { ViewPort, Point, Direction } from './viewport';

export function addKeyboardArrowHandlers(viewport: ViewPort) {
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") {
      viewport.pan(Direction.Left);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") {
      viewport.pan(Direction.Right);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") {
      viewport.pan(Direction.Up);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      viewport.pan(Direction.Down);
    }
  });
}
export function addMouseHandlers(viewport: ViewPort, lockedLatLng: Point, canvas: HTMLCanvasElement) {
  canvas.addEventListener("mousedown", e => {
    lockedLatLng = viewport.screenToLatLng(new Point(e.x, e.y), canvas);
  });
  canvas.addEventListener("mouseup", e => {
    lockedLatLng = null;
  });
  canvas.addEventListener("mousemove", e => {
    if (lockedLatLng) {
      const cursor = new Point(e.x, e.y);
      viewport.panTo(cursor, lockedLatLng, e.timeStamp, canvas);
    }
  });
}
export function addScrollHandlers(viewport: ViewPort, canvas: HTMLCanvasElement) {
  document.addEventListener("wheel", e => {
    const amount = e.deltaY > 0 ? 0.1 : -0.1;
    viewport.zoom(new Point(e.x, e.y), canvas, amount);
    console.log('zoom');
  });
}
export function addDebugMouseHandlers(viewport: ViewPort, chunkloader: Chunkloader, canvas: HTMLCanvasElement) {
  canvas.addEventListener("mousedown", e => {
    const pt = viewport.screenToLatLng(new Point(e.x, e.y), canvas);
    const chunk = chunkloader.getChunkContaining(pt, viewport);
    console.log(chunk, chunkloader.cache[chunk]);
    // print the cache values of all ancestors
    // for (let i = 0; i < chunk.length; i++) {
    //   const c = chunk.slice(0, i + 1);
    //   console.log(c, chunkloader.cache[c]);
    // }
  });
}