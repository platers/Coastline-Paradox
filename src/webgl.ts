import * as webglUtils from './webgl-utils';
import {inflate} from 'pako';

// Load the gzip file and decompress it.
async function loadPolygons() {
  const response = await fetch("data_processing/polygons.json.gz");
  const arrayBuffer = await response.arrayBuffer();
  const decompressed = inflate(new Uint8Array(arrayBuffer), { to: "string" });
  return JSON.parse(decompressed);
}


function main() {
  // Get A WebGL context
  var canvas = document.querySelector("#canvas") as HTMLCanvasElement;
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // Get the strings for our GLSL shaders
  var vertexShaderSource = (document.querySelector("#vertex-shader-2d") as HTMLScriptElement).text;
  var fragmentShaderSource = (document.querySelector("#fragment-shader-2d") as HTMLScriptElement).text;

  // Link the two shaders into a program
  var program = webglUtils.createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

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
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  // set the resolution
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  // draw 50 random rectangles in random colors
  for (var ii = 0; ii < 10; ++ii) {
    var line = [];
    for (var jj = 0; jj < 9; ++jj) {
        line.push(randomInt(1000));
    }
    setLine(gl, line);

    // Draw the loop.
    var primitiveType = gl.LINE_LOOP;
    var offset = 0;
    var count = 4;
    gl.drawArrays(primitiveType, offset, count);
  }
}

// Returns a random integer from 0 to range - 1.
function randomInt(range) {
  return Math.floor(Math.random() * range);
}

// Fill the buffer with the values that define a rectangle.
function setLine(gl, line) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
}

main();
