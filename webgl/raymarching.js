var gl;

function getShader(gl, id) {
	var script = document.getElementById(id);
	if(!script) {
		return null;
	}

	var src = "";
	var k = script.firstChild;
	while(k) {
		if(k.nodeType == 3) {
			src += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if(script.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if(script.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, src);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var program;
var positionAttribLoc;
var vbo;

function init(canvas) {
	gl.viewport(0, 0, canvas.width, canvas.height);

	var fragmentShader = getShader(gl, "fshader");
	var vertexShader = getShader(gl, "vshader");

	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program");
	}

	gl.useProgram(program);

	var quad = [
		-1.0, -1.0, 0.0,
		-1.0,  1.0, 0.0,
		 1.0, -1.0, 0.0,
		 1.0,  1.0, 0.0
	];

	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW);

	positionAttribLoc = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(positionAttribLoc);
	gl.vertexAttribPointer(positionAttribLoc, 3, gl.FLOAT, false, 0, 0);

	g_colorLoc = gl.getUniformLocation(program, "g_color");
}

function render() {
	gl.clearColor(0.3, 0.3, 0.3, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.uniform3f(g_colorLoc, 1.0, 0.5, 0.0);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function start() {
	var canvas = document.getElementById("glcanvas");
	var container = document.getElementById("container");

	if(!window.WebGLRenderingContext) {
		container.innerHTML = "Unable to initialize <a href=\"http://get.webgl.org\">WebGL</a>. Your browser may not support it.";
	}

	gl = null;
	try {
		gl = canvas.getContext("webgl"); 
	} catch(e) {

	}

	if(!gl) {
		container.innerHTML = "Your browser supports WebGL but initialization failed. See <a href=\"http://get.webgl.org/troubleshooting\">troubleshooting WebGL</a>.";
	} else {
		init(canvas);
		render();
	}
}