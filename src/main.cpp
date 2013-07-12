#include <iostream>
#include <src/opengl.h>
#include <src/fileio.h>
using namespace glm;

const float TWO_PI = 6.28318530718f;

// Camera
float g_theta = 0.0f;
float g_phi = 0.0f;
vec3 g_camUp		= normalize(vec3(0.0f, 1.0f, 0.0f));	// The upward-vector of the image plane
vec3 g_camRight		= normalize(vec3(1.0f, 0.0f, 0.0f));	// The right-vector of the image plane
vec3 g_camForward	= cross(g_camRight, g_camUp);			// The forward-vector of the image plane
vec3 g_eye			= vec3(0.0f, 0.0f, -2.0f);				// The eye position in the world
float g_focalLength = 1.67f;									// Distance between eye and image-plane
float g_zNear		= 0.0f;									// Near plane distance from camera
float g_zFar		= 25.0f;								// Far plane distance from camera
float g_moveSpeed	= 0.1f;

// Raymarch parameters
int g_rmSteps		= 512;
float g_rmEpsilon	= 0.0005f;

// Scene
//vec4 g_skyColor 		= vec4(0.8f, 0.9f, 0.95f, 1.0f);
//vec4 g_skyColor 		= vec4(0.8f, 0.8f, 0.8f, 1.0f);
vec4 g_skyColor 		= vec4(0.31f, 0.47f, 0.67f, 1.0f);
//vec4 g_skyColor 		= vec4(0.1f, 0.1f, 0.15f, 1.0f);
vec4 g_ambient			= vec4(0.15, 0.2f, 0.32f, 1.0f);
vec3 g_light0Position 	= vec3(0.25f, 2.0f, 0.0f);
//vec4 g_light0Color 		= vec4(0.37f, 0.57f, 0.63f, 1.0f);
vec4 g_light0Color 		= vec4(0.67f, 0.87f, 0.93f, 1.0f);

const int g_windowWidth = 320;
const int g_windowHeight = 200;
float g_aspectRatio = g_windowWidth / (float)g_windowHeight;

void updateCamera()
{
	if(glfwGetKey('A'))
		g_eye -= g_camRight * g_moveSpeed;
	else if(glfwGetKey('D'))
		g_eye += g_camRight * g_moveSpeed;

	if(glfwGetKey('W'))
		g_eye += g_camForward * g_moveSpeed;
	else if(glfwGetKey('S'))
		g_eye -= g_camForward * g_moveSpeed;

	if(glfwGetKey(GLFW_KEY_SPACE))
		g_eye += g_camUp * g_moveSpeed;
	else if(glfwGetKey(GLFW_KEY_LCTRL))
		g_eye -= g_camUp * g_moveSpeed;

	if(glfwGetKey(GLFW_KEY_LEFT))
		g_light0Position -= g_camRight * g_moveSpeed;
	else if(glfwGetKey(GLFW_KEY_RIGHT))
		g_light0Position += g_camRight * g_moveSpeed;

	if(glfwGetKey(GLFW_KEY_UP))
		g_light0Position += g_camUp * g_moveSpeed;
	else if(glfwGetKey(GLFW_KEY_DOWN))
		g_light0Position -= g_camUp * g_moveSpeed;

	int mposX, mposY;
	glfwGetMousePos(&mposX, &mposY);
	glfwSetMousePos(g_windowWidth / 2, g_windowHeight / 2);
	int dx = mposX - g_windowWidth / 2;
	int dy = mposY - g_windowHeight / 2;
	g_theta += dx * 0.01f;
	if(g_theta > TWO_PI)
		g_theta -= TWO_PI;
	else if(g_theta < 0.0f)
		g_theta += TWO_PI;

	g_phi += dy * 0.01f;
	if(g_phi > TWO_PI)
		g_phi -= TWO_PI;
	else if(g_phi < 0.0f)
		g_phi += TWO_PI;

	float sintheta = sinf(g_theta);
	float costheta = cosf(g_theta);
	float sinphi = sinf(g_phi);
	float cosphi = cosf(g_phi);
	g_camForward = vec3(cosphi * sintheta, -sinphi, cosphi * costheta);
	g_camRight = vec3(costheta, 0.0f, -sintheta);
	g_camUp = normalize(cross(g_camForward, g_camRight));
}

std::ostream &operator<<(std::ostream &out, const vec3 &v)
{
	out<<"("<<v.x<<" "<<v.y<<" "<<v.z<<")";
	return out;
}

int main()
{
	if(!createContext("Raymarching Distance Fields", g_windowWidth, g_windowHeight, 0, 0, 0, false))
		return EXIT_FAILURE;

	glfwSetWindowPos(300, 10);
	glfwSetMousePos(g_windowWidth / 2, g_windowHeight / 2);
	glfwDisable(GLFW_MOUSE_CURSOR);

	std::string raymarch_vert, raymarch_frag;
	if(!readFile("data/raymarch.vert", raymarch_vert) ||
		!readFile("data/raymarch.frag", raymarch_frag))
		return EXIT_FAILURE;

	GLuint vertShader0 = compileShader(GL_VERTEX_SHADER, 1, raymarch_vert);
	GLuint fragShader0 = compileShader(GL_FRAGMENT_SHADER, 1, raymarch_frag);
	GLuint program0 = createProgram(vertShader0, fragShader0);
	glUseProgram(program0);

	GLfloat vertices[] = {
		-1.0f, -1.0f, 1.0f, -1.0f, 1.0f,  1.0f, 
		1.0f, 1.0f, -1.0f,  1.0f, -1.0f, -1.0f
	};

	GLuint vao;
	glGenVertexArrays(1, &vao);
	glBindVertexArray(vao);

	GLuint vbo;
	glGenBuffers(1, &vbo);
	glBindBuffer(GL_ARRAY_BUFFER, vbo);
	glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

	GLuint positionAttrib = glGetAttribLocation(program0, "position");
	glEnableVertexAttribArray(positionAttrib);
	glVertexAttribPointer(positionAttrib, 2, GL_FLOAT, GL_FALSE, 0, 0);

	GLuint g_camUpLoc		= glGetUniformLocation(program0, "g_camUp");
	GLuint g_camRightLoc	= glGetUniformLocation(program0, "g_camRight");
	GLuint g_camForwardLoc	= glGetUniformLocation(program0, "g_camForward");
	GLuint g_eyeLoc			= glGetUniformLocation(program0, "g_eye");
	GLuint g_focalLengthLoc	= glGetUniformLocation(program0, "g_focalLength");
	GLuint g_zNearLoc		= glGetUniformLocation(program0, "g_zNear");
	GLuint g_zFarLoc		= glGetUniformLocation(program0, "g_zFar");
	GLuint g_aspectRatioLoc	= glGetUniformLocation(program0, "g_aspectRatio");
	GLuint g_rmStepsLoc		= glGetUniformLocation(program0, "g_rmSteps");
	GLuint g_rmEpsilonLoc	= glGetUniformLocation(program0, "g_rmEpsilon");
	GLuint g_skyColorLoc	= glGetUniformLocation(program0, "g_skyColor");
	GLuint g_ambientLoc		= glGetUniformLocation(program0, "g_ambient");
	GLuint g_light0PosLoc	= glGetUniformLocation(program0, "g_light0Position");
	GLuint g_light0ColorLoc	= glGetUniformLocation(program0, "g_light0Color");
	
	glUniform1f(g_zNearLoc,			g_zNear);
	glUniform1f(g_zFarLoc,			g_zFar);
	glUniform1f(g_aspectRatioLoc,	g_aspectRatio);
	glUniform1f(g_rmEpsilonLoc,		g_rmEpsilon);
	glUniform1i(g_rmStepsLoc,		g_rmSteps);

	double renderTime = 0.0;
	double targetFrameTime = 1.0 / 30.0;
	while(glfwGetWindowParam(GLFW_OPENED) == GL_TRUE)
	{
		if(glfwGetKey(GLFW_KEY_ESC))
			glfwCloseWindow();
		else if(glfwGetKey('R'))
		{
			std::cout<<g_camUp<<'\n'<<g_camRight<<'\n'<<g_eye<<'\n';
		}

		updateCamera();

		g_camUp = vec3(0.151938f, 0.955337f, 0.25347f);
		g_camRight = vec3(0.87709f, 0, -0.514136f);
		g_eye = vec3(-0.8f, 0.793f, -2.12f);
		g_camForward = cross(g_camRight, g_camUp);

		double renderStart = glfwGetTime();
		glClearColor(0, 0, 0, 0);
		glClear(GL_COLOR_BUFFER_BIT);

		glUniform3fv(g_camUpLoc,			1, value_ptr(g_camUp));
		glUniform3fv(g_camRightLoc,			1, value_ptr(g_camRight));
		glUniform3fv(g_camForwardLoc,		1, value_ptr(g_camForward));
		glUniform3fv(g_eyeLoc,				1, value_ptr(g_eye));
		glUniform1f(g_focalLengthLoc,		g_focalLength);
		glUniform4fv(g_skyColorLoc,			1, value_ptr(g_skyColor));
		glUniform4fv(g_ambientLoc,			1, value_ptr(g_ambient));
		glUniform3fv(g_light0PosLoc,		1, value_ptr(g_light0Position));
		glUniform4fv(g_light0ColorLoc,		1, value_ptr(g_light0Color));

		glDrawArrays(GL_TRIANGLES, 0, 6);

		glfwSwapBuffers();
		renderTime = glfwGetTime() - renderStart;
		if(renderTime < targetFrameTime)
			glfwSleep(targetFrameTime - renderTime);

		glfwPollEvents();
	}

	destroyContext();
	return EXIT_SUCCESS;
}