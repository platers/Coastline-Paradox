import { addKeyboardArrowHandlers, addScrollHandlers, addMouseHandlers, addDebugMouseHandlers } from './controls';
import { Chunkloader } from './chunkloader';
import { Chunks, RawLine } from './types';
import { ViewPort, Point } from './viewport';
import * as webglUtils from './webgl-utils';

export async function main(chunkloader: Chunkloader) {
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
  async function render(timestamp: number) {
    // Update viewport
    if (!lockedLatLng) {
      viewport.accelerate(timestamp);
    }

    // Get chunks
    chunkloader.loadChunks(viewport);
    // log cache size
    // console.log(chunkloader.cacheSize());
    

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // set the viewport
    gl.uniform4f(viewportUniformLocation, viewport.p1.x, viewport.p1.y, viewport.p2.x, viewport.p2.y);

    // Get lines
    const lines = chunkloader.getLines(viewport, false);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines.flat().flat()), gl.STATIC_DRAW);
    drawLines(gl, lines.length);

    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);

  // Event handlers
  addKeyboardArrowHandlers(viewport);
  addScrollHandlers(viewport, canvas);
  addMouseHandlers(viewport, lockedLatLng, canvas);
  addDebugMouseHandlers(viewport, chunkloader, canvas);
}


function drawLines(gl: WebGLRenderingContext, count: number) {
  var primitiveType = gl.LINES;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, count * 2);
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