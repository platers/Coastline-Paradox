export enum Direction {
  Up,
  Down,
  Left,
  Right
}
export class Point {
  constructor(public x: number, public y: number) {
  }
}
class Line {
  constructor(public p1: Point, public p2: Point) {
  }
}
export class ViewPort {
  constructor(public p1: Point, public p2: Point) {
    // p1 is bottom right, p2 is top left
  }

  get width() {
    return this.p2.x - this.p1.x;
  }

  get height() {
    return this.p2.y - this.p1.y;
  }

  pan(direction: Direction, amount = 0.1) {
    const dx = this.width * amount;
    const dy = this.height * amount;
    switch (direction) {
      case Direction.Up:
        this.p1.y += dy;
        this.p2.y += dy;
        break;
      case Direction.Down:
        this.p1.y -= dy;
        this.p2.y -= dy;
        break;
      case Direction.Left:
        this.p1.x += dx;
        this.p2.x += dx;
        break;
      case Direction.Right:
        this.p1.x -= dx;
        this.p2.x -= dx;
        break;
    }
    this.normalize();
  }

  screenToRelative(screen: Point, canvas: HTMLCanvasElement) {
    const x = screen.x / canvas.clientWidth;
    const y = screen.y / canvas.clientHeight;
    return new Point(x, y);
  }

  screenToLatLng(screen: Point, canvas: HTMLCanvasElement) {
    const lat = this.p2.y - (screen.y / canvas.height) * this.height;
    const lng = this.p2.x - (screen.x / canvas.width) * this.width;
    return new Point(lng, lat);
  }

  panTo(cursor: Point, lockedLatLng: Point, canvas: HTMLCanvasElement) {
    const cursorLatLng = this.screenToLatLng(cursor, canvas);
    const latDiff = lockedLatLng.y - cursorLatLng.y;
    const lngDiff = lockedLatLng.x - cursorLatLng.x;
    this.p1.y += latDiff;
    this.p2.y += latDiff;
    this.p1.x += lngDiff;
    this.p2.x += lngDiff;
    this.normalize();
  }

  zoom(cursor: Point, canvas: HTMLCanvasElement, amount = 0.1) {
    const width = this.width * (1 + amount);
    const height = this.height * (1 + amount);
    const relCursor = this.screenToRelative(cursor, canvas);
    const cursorLatLng = this.screenToLatLng(cursor, canvas);
    this.p2 = new Point(cursorLatLng.x + width * relCursor.x, cursorLatLng.y + height * relCursor.y);
    this.p1 = new Point(this.p2.x - width, this.p2.y - height);
    this.normalize();
  }

  normalize() {
    // translate to small coordinates
    while (this.p1.x > 180) {
      this.p1.x -= 360;
      this.p2.x -= 360;
    }
    while (this.p1.y > 90) {
      this.p1.y -= 180;
      this.p2.y -= 180;
    }
    while (this.p1.x < -180) {
      this.p1.x += 360;
      this.p2.x += 360;
    }
    while (this.p1.y < -90) {
      this.p1.y += 180;
      this.p2.y += 180;
    }

    // make sure width < 360 and height < 180
    const width = this.p2.x - this.p1.x;
    const height = this.p2.y - this.p1.y;
    if (width > 360) {
      const diff = width - 360;
      this.p1.x += diff / 2;
      this.p2.x -= diff / 2;
    }
    if (height > 180) {
      const diff = height - 180;
      this.p1.y += diff / 2;
      this.p2.y -= diff / 2;
    }

    // make sure view does not go above or below the poles
    if (this.p2.y > 90) {
      if (Math.abs(this.p1.y - 90) < Math.abs(this.p2.y - 90)) { // this.p1 is closer to the pole
        const diff = this.p1.y - 90;
        this.p1.y -= diff;
        this.p2.y -= diff;
      } else {
        const diff = this.p2.y - 90;
        this.p1.y -= diff;
        this.p2.y -= diff;
      }
    }
  }

  scale(multiplyBy: number) {
    const width = this.width * multiplyBy;
    const height = this.height * multiplyBy;
    const center = new Point(this.p1.x + this.width / 2, this.p1.y + this.height / 2);
    const newP1 = new Point(center.x - width / 2, center.y - height / 2);
    const newP2 = new Point(center.x + width / 2, center.y + height / 2);
    return new ViewPort(newP1, newP2);
  }

  clone() {
    return new ViewPort(new Point(this.p1.x, this.p1.y), new Point(this.p2.x, this.p2.y));
  }

  intersectionArea(other: ViewPort) {
    const x_overlap = Math.max(0, Math.min(this.p2.x, other.p2.x) - Math.max(this.p1.x, other.p1.x));
    const y_overlap = Math.max(0, Math.min(this.p2.y, other.p2.y) - Math.max(this.p1.y, other.p1.y));
    return x_overlap * y_overlap;
  }
  normalizedIntersectionArea(other: ViewPort) {
    const dx = 360, dy = 180;
    let maxArea = 0;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const p1 = new Point(this.p1.x + i * dx, this.p1.y + j * dy);
        const p2 = new Point(this.p2.x + i * dx, this.p2.y + j * dy);
        const area = new ViewPort(p1, p2).intersectionArea(other);
        if (area > maxArea) {
          maxArea = area;
        }
      }
    }
    return maxArea;
  }

  intersects(other: ViewPort) {
    return this.normalizedIntersectionArea(other) / Math.min(this.area(), other.area()) > 1 / 100;
  }

  area() {
    return this.width * this.height;
  }

  getQuadrants() {
    const width = this.width / 2;
    const height = this.height / 2;
    const quadrants = [
      new ViewPort(new Point(this.p1.x, this.p1.y), new Point(this.p1.x + width, this.p1.y + height)),
      new ViewPort(new Point(this.p1.x + width, this.p1.y), new Point(this.p2.x, this.p1.y + height)),
      new ViewPort(new Point(this.p1.x + width, this.p1.y + height), new Point(this.p2.x, this.p2.y)),
      new ViewPort(new Point(this.p1.x, this.p1.y + height), new Point(this.p1.x + width, this.p2.y)),
    ]
    return quadrants;
  }

}
