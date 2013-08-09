var gl = null;

function initGL(canvas) {
	var container = document.getElementById("container");
	if(!window.WebGLRenderingContext) {
		container.innerHTML = "Unable to initialize <a href=\"http://get.webgl.org\">WebGL</a>. Your browser may not support it.";
	}

	try { gl = canvas.getContext("webgl"); } 
	catch(e) { }

	if(gl == null) {
		try { gl = canvas.getContext("experimental-webgl"); }
		catch (e) { gl = null };
	}
}

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
var vbo;

function initProgram() {
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

	program.positionAttrib = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(program.positionAttrib);
	gl.vertexAttribPointer(program.positionAttrib, 3, gl.FLOAT, false, 0, 0);

	program.resolutionUniform = gl.getUniformLocation(program, "g_resolution");
	program.camUpUniform = gl.getUniformLocation(program, "g_camUp");
	program.camRightUniform = gl.getUniformLocation(program, "g_camRight");
	program.camForwardUniform = gl.getUniformLocation(program, "g_camForward");
	program.eyeUniform = gl.getUniformLocation(program, "g_eye");
	program.light0PositionUniform = gl.getUniformLocation(program, "g_light0Position");
	program.light0ColorUniform = gl.getUniformLocation(program, "g_light0Color");
}

var g_eye;
var g_camUp;
var g_camRight;
var g_camForward;
var g_light0Position = [0, 4, 0];
var g_light0Color = [0.67, 0.87, 0.93, 1.0];
var horizontalAngle = 0.0;
var verticalAngle = 0.0;

function initCamera() {
	g_eye = [0, 1, -2];
	g_camUp = [0, 1, 0];
	g_camRight = [1, 0, 0];
	g_camForward = vec3.create();
	vec3.cross(g_camForward, g_camRight, g_camUp);
	vec3.normalize(g_camForward, g_camForward);
}

var mouseSpeedX = null;
var mouseSpeedY = null;

function handleMouseMove(event) {
	var mouseX = event.clientX;
	var mouseY = event.clientY;

	var rect = document.getElementById("glcanvas").getBoundingClientRect();
	var dx = mouseX - (rect.left + rect.width / 2);
	var dy = mouseY - (rect.top + rect.height / 2);

	mouseSpeedX = dx * 0.00005;
	mouseSpeedY = dy * 0.00005;
}

var currentKeys = {};

function handleKeyDown(event) {
	currentKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
	currentKeys[event.keyCode] = false;
}

function handleInput() {
	var moveSpeed = 0.05;
	if(currentKeys[87]) { // Forward
		g_eye[0] += g_camForward[0] * moveSpeed;
		g_eye[1] += g_camForward[1] * moveSpeed;
		g_eye[2] += g_camForward[2] * moveSpeed;
	} else if(currentKeys[83]) { // Backward
		g_eye[0] -= g_camForward[0] * moveSpeed;
		g_eye[1] -= g_camForward[1] * moveSpeed;
		g_eye[2] -= g_camForward[2] * moveSpeed;
	}

	if(currentKeys[68]) { // Right
		g_eye[0] += g_camRight[0] * moveSpeed;
		g_eye[1] += g_camRight[1] * moveSpeed;
		g_eye[2] += g_camRight[2] * moveSpeed;
	} else if(currentKeys[65]) { // Left
		g_eye[0] -= g_camRight[0] * moveSpeed;
		g_eye[1] -= g_camRight[1] * moveSpeed;
		g_eye[2] -= g_camRight[2] * moveSpeed;
	}

	if(currentKeys[37]) { // Arrow left
		g_light0Position[0] -= g_camRight[0] * moveSpeed;
		g_light0Position[1] -= g_camRight[1] * moveSpeed;
		g_light0Position[2] -= g_camRight[2] * moveSpeed;
	} else if(currentKeys[39]) { // Arrow right
		g_light0Position[0] += g_camRight[0] * moveSpeed;
		g_light0Position[1] += g_camRight[1] * moveSpeed;
		g_light0Position[2] += g_camRight[2] * moveSpeed;
	}

	if(currentKeys[38]) { // Arrow up
		g_light0Position[0] += g_camUp[0] * moveSpeed;
		g_light0Position[1] += g_camUp[1] * moveSpeed;
		g_light0Position[2] += g_camUp[2] * moveSpeed;
	} else if(currentKeys[40]) { // Arrow down
		g_light0Position[0] -= g_camUp[0] * moveSpeed;
		g_light0Position[1] -= g_camUp[1] * moveSpeed;
		g_light0Position[2] -= g_camUp[2] * moveSpeed;
	}
}

function updateCamera() {
	horizontalAngle += mouseSpeedX;
	verticalAngle += mouseSpeedY;

	if(horizontalAngle > 2.0 * Math.PI)
		horizontalAngle -= 2.0 * Math.PI;
	else if(horizontalAngle < 0.0)
		horizontalAngle += 2.0 * Math.PI;

	if(verticalAngle > 2.0 * Math.PI)
		verticalAngle -= 2.0 * Math.PI;
	else if(verticalAngle < 0.0)
		verticalAngle += 2.0 * Math.PI;

	// Update camera vectors
	var sintheta = Math.sin(horizontalAngle);
	var costheta = Math.cos(horizontalAngle);
	var sinphi = Math.sin(verticalAngle);
	var cosphi = Math.cos(verticalAngle);
	g_camForward = [cosphi * sintheta, -sinphi, cosphi * costheta];
	g_camRight = [costheta, 0.0, -sintheta];
	vec3.cross(g_camUp, g_camForward, g_camRight);
	vec3.normalize(g_camUp, g_camUp);
}

function updateUniforms() {
	gl.uniform2f(program.resolutionUniform, gl.viewportWidth, gl.viewportHeight);
	gl.uniform3f(program.camUpUniform, g_camUp[0], g_camUp[1], g_camUp[2]);
	gl.uniform3f(program.camRightUniform, g_camRight[0], g_camRight[1], g_camRight[2]);
	gl.uniform3f(program.camForwardUniform, g_camForward[0], g_camForward[1], g_camForward[2]);
	gl.uniform3f(program.eyeUniform, g_eye[0], g_eye[1], g_eye[2]);
	gl.uniform3f(program.light0PositionUniform, g_light0Position[0], g_light0Position[1], g_light0Position[2]);
	gl.uniform4f(program.light0ColorUniform, g_light0Color[0], g_light0Color[1], g_light0Color[2], g_light0Color[3]);
}

function render(canvas) {
	gl.clear(gl.COLOR_BUFFER_BIT);

	handleInput();
	updateCamera();
	updateUniforms();

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function tick() {
	requestAnimFrame(tick);
	render();
}

function start() {
	var canvas = document.getElementById("glcanvas");

	initGL(canvas);

	if(gl)
	{
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;

		initProgram();
		initCamera();

		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clearColor(0.3, 0.3, 0.3, 1);

		document.onmousemove = handleMouseMove;
		document.onkeydown = handleKeyDown;
		document.onkeyup = handleKeyUp;

		tick();
	}
}