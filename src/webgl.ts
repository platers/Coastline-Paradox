import * as webglUtils from './webgl-utils';

type Point = [number, number];
type Line = [Point, Point];
type Chunk = string;
type Chunks = {
  [key: Chunk]: Line[];
};
type ViewPort = [Point, Point]; // [top-left, bottom-right]

export async function main(chunks: Chunks) {
  // Get A WebGL context
  const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  var { viewportUniformLocation } = setupGl(gl);
  const viewport: ViewPort = [ [-180, -90], [180, 90] ];

  // Render loop
  function render() {
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // set the viewport
    gl.uniform4f(viewportUniformLocation, viewport[0][0], viewport[0][1], viewport[1][0], viewport[1][1]);

    // Get lines
    const lines = getLines(chunks, viewport);

    setLine(gl, lines.flat().flat());
    drawLines(gl, lines.length);

    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);

  // Event handlers
  addKeyboardArrowHandlers(viewport);
  addScrollHandlers(viewport);
}

function normalizeViewport(viewport: ViewPort) {
  const [p1, p2] = viewport;
  // translate to small coordinates
  while (p1[0] > 180) {
    p1[0] -= 360;
    p2[0] -= 360;
  }
  while (p1[1] > 90) {
    p1[1] -= 180;
    p2[1] -= 180;
  }
  while (p1[0] < -180) {
    p1[0] += 360;
    p2[0] += 360;
  }
  while (p1[1] < -90) {
    p1[1] += 180;
    p2[1] += 180;
  }

  // make sure width < 360 and height < 180
  const width = p2[0] - p1[0];
  const height = p2[1] - p1[1];
  if (width > 360) {
    const diff = width - 360;
    p1[0] += diff / 2;
    p2[0] -= diff / 2;
  }
  if (height > 180) {
    const diff = height - 180;
    p1[1] += diff / 2;
    p2[1] -= diff / 2;
  }

  return [p1, p2];
}

function addKeyboardArrowHandlers(viewport: ViewPort) {
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") {
      console.log("pan left");
      viewport[0][0] += 10;
      viewport[1][0] += 10;
    }
    normalizeViewport(viewport);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") {
      console.log("pan right");
      viewport[0][0] -= 10;
      viewport[1][0] -= 10;
    }
    normalizeViewport(viewport);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") {
      console.log("pan up");
      viewport[0][1] += 10;
      viewport[1][1] += 10;
    }
    normalizeViewport(viewport);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      console.log("pan down");
      viewport[0][1] -= 10;
      viewport[1][1] -= 10;
    }
    normalizeViewport(viewport);
  });
}

function addScrollHandlers(viewport: ViewPort) {
  document.addEventListener("wheel", e => {
    const delta = e.deltaY;
    const width = viewport[1][0] - viewport[0][0];
    const height = viewport[1][1] - viewport[0][1];
    if (delta < 0) {
      console.log("zoom in");
      // shrink viewport by 10%
      viewport[0][0] += width * 0.1;
      viewport[0][1] += height * 0.1;
      viewport[1][0] -= width * 0.1;
      viewport[1][1] -= height * 0.1;
    } else if (delta > 0) {
      console.log("zoom out");
      // grow viewport by 10%
      viewport[0][0] -= width * 0.1;
      viewport[0][1] -= height * 0.1;
      viewport[1][0] += width * 0.1;
      viewport[1][1] += height * 0.1;
    }
    normalizeViewport(viewport);
  });
}

function drawLines(gl: WebGLRenderingContext, count: number) {
  var primitiveType = gl.LINES;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, count * 2);
}

function getLines(chunks: Chunks, viewport: ViewPort) {
  let lines: Line[] = [];
  // flatten the lines into a single array
  for (const [chunk, lines1] of Object.entries(chunks)) {
    lines = lines.concat(lines1);
  }
  lines = lines.map(line => {
    const [p1, p2] = line;
    // wrap line to be right and under the top left corner
    while (p1[0] < viewport[0][0] && p2[0] < viewport[0][0]) {
      p1[0] += 360;
      p2[0] += 360;
    }
    while (p1[1] < viewport[0][1] && p2[1] < viewport[0][1]) {
      p1[1] += 180;
      p2[1] += 180;
    }
    while (p1[0] - 360 > viewport[0][0] && p2[0] - 360 > viewport[0][0]) {
      p1[0] -= 360;
      p2[0] -= 360;
    }
    while (p1[1] - 180 > viewport[0][1] && p2[1] - 180 > viewport[0][1]) {
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

function setLine(gl, line) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
}
