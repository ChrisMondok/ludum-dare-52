export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
  xOrigin: 'left'|'center'|'right';
  yOrigin: 'top'|'center'|'bottom';
}

export interface Circle extends Point {
  radius: number;
}


export function touches(container: Shape, point: Point) {
  if(isCircle(container)) {
    return distSquared(container, point) <= Math.pow(container.radius, 2);
  }
  if(isRectangle(container)) {
    return getRightOf(point) >= getLeftOf(container) &&
      getLeftOf(point) <= getRightOf(container) &&
      getBottomOf(point) >= getTopOf(container) &&
      getTopOf(point) <= getBottomOf(container);
  }
  return point.x === point.y && container.x === container.y;
}

export function isShape(obj: object): obj is Shape {
  return 'x' in obj && 'y' in obj;
}

export function isRectangle(shape: Shape): shape is Rectangle {
  return 'width' in shape;
}

export function isCircle(shape: Shape): shape is Circle {
  return 'radius' in shape;
}

export type Shape = Point|Rectangle|Circle;

export function distSquared(a: Point, b: Point) {
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
}

export function getLeftOf(shape: Shape) {
  if(isRectangle(shape)) {
    switch(shape.xOrigin) {
      case 'left': return shape.x;
      case 'right': return shape.x - shape.width;
      case 'center': return shape.x - (shape.width / 2);
      default: throw new Error(`Unrecognized xOrigin ${shape.yOrigin}`);
    }
  } else if(isCircle(shape)) {
    return shape.x - shape.radius;
  }
  else {
    return shape.x;
  }
}

export function getRightOf(shape: Shape) {
  if(isRectangle(shape)) {
    switch(shape.xOrigin) {
      case 'left': return shape.x + shape.width;
      case 'right': return shape.x;
      case 'center': return shape.x + (shape.width / 2);
      default: throw new Error(`Unrecognized xOrigin ${shape.yOrigin}`);
    }
  } else if(isCircle(shape)) {
    return shape.x + shape.radius;
  }
  else {
    return shape.x;
  }
}

export function getTopOf(shape: Shape) {
  if(isRectangle(shape)) {
    switch(shape.yOrigin) {
      case 'top': return shape.y;
      case 'bottom': return shape.y - shape.height;
      case 'center': return shape.y - (shape.height / 2);
      default: throw new Error(`Unrecognized yOrigin ${shape.yOrigin}`);
    }
  } else if(isCircle(shape)) {
    return shape.y - shape.radius;
  }
  else {
    return shape.y;
  }
}

export function getBottomOf(shape: Shape) {
  if(isRectangle(shape)) {
    switch(shape.yOrigin) {
      case 'top': return shape.y + shape.height;
      case 'bottom': return shape.y;
      case 'center': return shape.y + (shape.height / 2);
      default: throw new Error(`Unrecognized yOrigin ${shape.yOrigin}`);
    }
  } else if(isCircle(shape)) {
    return shape.y + shape.radius;
  }
  else {
    return shape.y;
  }
}

export function clamp(value: number, min: number, max: number): number {
  if(min > max) return clamp(value, max, min);
  return Math.max(Math.min(value, max), min);
}
