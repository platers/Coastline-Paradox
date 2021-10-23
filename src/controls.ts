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
      viewport.panTo(cursor, lockedLatLng, canvas);
    }
  });
}
export function addScrollHandlers(viewport: ViewPort, canvas: HTMLCanvasElement) {
  document.addEventListener("wheel", e => {
    const amount = e.deltaY > 0 ? 0.1 : -0.1;
    viewport.zoom(new Point(e.x, e.y), canvas, amount);
  });
}
