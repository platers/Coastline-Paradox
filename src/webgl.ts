import { ViewPort, Point, Direction } from './viewport';
import * as webglUtils from './webgl-utils';

type RawPoint = [number, number];
type RawLine = [RawPoint, RawPoint];
type Chunk = string;
type Chunks = {
  [key: Chunk]: RawLine[];
};

export async function main(chunks: Chunks) {
  // Get A WebGL context
  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  var { viewportUniformLocation } = setupGl(gl);
  // State
  const viewport: ViewPort = new ViewPort(new Point(-180, -90), new Point(180, 90));
  let lockedLatLng: Point | null = null;

  // Render loop
  function render() {
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // set the viewport
    gl.uniform4f(viewportUniformLocation, viewport.p1.x, viewport.p1.y, viewport.p2.x, viewport.p2.y);

    // Get lines
    const lines = getLines(chunks, viewport);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines.flat().flat()), gl.STATIC_DRAW);
    drawLines(gl, lines.length);

    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);

  // Event handlers
  addKeyboardArrowHandlers(viewport);
  addScrollHandlers(viewport, canvas);
  addMouseHandlers(viewport, lockedLatLng, canvas);
}


function addKeyboardArrowHandlers(viewport: ViewPort) {
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

function addMouseHandlers(viewport: ViewPort, lockedLatLng: Point, canvas: HTMLCanvasElement) {
  canvas.addEventListener("mousedown", e => {
    console.log(e);
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

function addScrollHandlers(viewport: ViewPort, canvas: HTMLCanvasElement) {
  document.addEventListener("wheel", e => {
    const amount = e.deltaY > 0 ? 0.1 : -0.1;
    viewport.zoom(new Point(e.x, e.y), canvas, amount);
  });
}

function drawLines(gl: WebGLRenderingContext, count: number) {
  var primitiveType = gl.LINES;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, count * 2);
}

function getLines(chunks: Chunks, viewport: ViewPort) {
  let lines: RawLine[] = [];
  // flatten the lines into a single array
  for (const [chunk, lines1] of Object.entries(chunks)) {
    lines = lines.concat(lines1);
  }
  lines = lines.map(line => {
    const [p1, p2] = line;
    const vp1 = viewport.p1;
    // wrap line to be right and under the top left corner
    while (p1[0] < vp1.x && p2[0] < vp1.x) {
      p1[0] += 360;
      p2[0] += 360;
    }
    while (p1[1] < vp1.y && p2[1] < vp1.y) {
      p1[1] += 180;
      p2[1] += 180;
    }
    while (p1[0] - 360 > vp1.x && p2[0] - 360 > vp1.x) {
      p1[0] -= 360;
      p2[0] -= 360;
    }
    while (p1[1] - 180 > vp1.y && p2[1] - 180 > vp1.y) {
      p1[1] -= 180;
      p2[1] -= 180;
    }
    return [p1, p2];
  });
  return lines;
}

function setupGl(gl: WebGLRenderingContext) {
  // Get the strings for our GLSL shaders
  var vertexShaderSource = (document.querySelector("#vertex-shader-2d") as HTMLScriptElement).text;
  var fragmentShaderSource = (document.querySelector("#fragment-shader-2d") as HTMLScriptElement).text;

  // Link the two shaders into a program
  var program = webglUtils.createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // look up where the vertex data needs to go.
  var lineAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  var viewportUniformLocation = gl.getUniformLocation(program, "u_viewport");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Turn on the attribute
  gl.enableVertexAttribArray(lineAttributeLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2; // 2 components per iteration
  var type = gl.FLOAT; // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    lineAttributeLocation, size, type, normalize, stride, offset);
  return { viewportUniformLocation };
}