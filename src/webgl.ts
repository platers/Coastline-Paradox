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
  const viewport: ViewPort = [ [0, 0], [180, 90] ];

  // Render loop
  function render() {
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // set the viewport
    gl.uniform4f(viewportUniformLocation, viewport[0][0], viewport[0][1], viewport[1][0], viewport[1][1]);

    // Get lines
    const lines = getLines(chunks);

    setLine(gl, lines.flat().flat());
    drawLines(gl, lines.length);

    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);
}

function drawLines(gl: WebGLRenderingContext, count: number) {
  var primitiveType = gl.LINES;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, count * 2);
}

function getLines(chunks: Chunks) {
  let lines: Line[] = [];
  // flatten the lines into a single array
  for (const [chunk, lines1] of Object.entries(chunks)) {
    lines = lines.concat(lines1);
  }
  return lines;
}

function setupGl(gl: WebGLRenderingContext) {
  // Get the strings for our GLSL shaders
  var vertexShaderSource = (document.querySelector("#vertex-shader-2d") as HTMLScriptElement).text;
  var fragmentShaderSource = (document.querySelector("#fragment-shader-2d") as HTMLScriptElement).text;

  // Link the two shaders into a program
  var program = webglUtils.createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

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
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2; // 2 components per iteration
  var type = gl.FLOAT; // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset);
  return { viewportUniformLocation };
}

function setLine(gl, line) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
}
