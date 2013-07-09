#include <src/opengl.h>
#include <vector>
#include <iostream>

bool createContext(const char *title, int width, int height, 
int depthbits, int stencilbits, int fsaa, bool fullscreen)
{
	if(glfwInit() != GL_TRUE)
		return false;

	glfwOpenWindowHint(GLFW_OPENGL_PROFILE,			0);	// 0 lets the system choose the profile
	glfwOpenWindowHint(GLFW_OPENGL_VERSION_MAJOR,	OPENGL_VERSION_MAJOR);
	glfwOpenWindowHint(GLFW_OPENGL_VERSION_MINOR,	OPENGL_VERSION_MINOR);
	glfwOpenWindowHint(GLFW_FSAA_SAMPLES,			fsaa);
	glfwOpenWindowHint(GLFW_WINDOW_NO_RESIZE,		GL_TRUE);

	if(glfwOpenWindow(
		width, height,
		0, 0, 0, 0, // Default color bits
		depthbits, stencilbits,
		(fullscreen ? GLFW_FULLSCREEN : GLFW_WINDOW)) != GL_TRUE)
		return false;

	glfwSetWindowTitle(title);

	// Note that this function fails if no GL context has been made current
	if(glload::LoadFunctions() == glload::LS_LOAD_FAILED)
		return false;
	
	std::cout						<<"Hello World!"<<std::endl<<"Running OpenGL ";
	std::cout						<<glfwGetWindowParam(GLFW_OPENGL_VERSION_MAJOR)<<".";
	std::cout						<<glfwGetWindowParam(GLFW_OPENGL_VERSION_MINOR)<<std::endl;
	std::cout<<"Debug context: "	<<(glfwGetWindowParam(GLFW_OPENGL_DEBUG_CONTEXT) ? "true" : "false")<<std::endl;
	std::cout<<"HW accelerated: "	<<(glfwGetWindowParam(GLFW_ACCELERATED) ? "true" : "false")<<std::endl;
	std::cout<<"Depth bits: "		<<glfwGetWindowParam(GLFW_DEPTH_BITS)<<std::endl;
	std::cout<<"Stencil bits: "		<<glfwGetWindowParam(GLFW_STENCIL_BITS)<<std::endl;
	std::cout<<"FSAA samples: "		<<glfwGetWindowParam(GLFW_FSAA_SAMPLES)<<std::endl;
	std::cout<<"Vendor: "			<<glGetString(GL_VENDOR)<<std::endl;
	std::cout<<"Renderer: "			<<glGetString(GL_RENDERER)<<std::endl;
	std::cout<<"GL ver.: "			<<glGetString(GL_VERSION)<<std::endl;
	std::cout<<"GLSL ver.: "		<<glGetString(GL_SHADING_LANGUAGE_VERSION)<<std::endl;

	return true;
}

void destroyContext()
{
	glfwTerminate();
}

GLuint compileShader(GLenum shaderType, GLsizei count, const std::string &shaderSrc)
{
	const char *shaderSrcStr = shaderSrc.c_str();
	GLuint shader = glCreateShader(shaderType);
	glShaderSource(shader, count, &shaderSrcStr, NULL);
	glCompileShader(shader);

	// Check status
	GLint status;
	glGetShaderiv(shader, GL_COMPILE_STATUS, &status);
	if(status == GL_FALSE)
	{
		GLint infoLogLength;
		glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &infoLogLength);
		GLchar *infoLog = new GLchar[infoLogLength + 1];
		glGetShaderInfoLog(shader, infoLogLength, NULL, infoLog);
		std::cerr<<"Compile failure: "<<infoLog<<std::endl;
		delete[] infoLog;
	}

	return shader;
}

GLuint createProgram(GLuint vertexShader, GLuint fragmentShader, GLuint geometryShader)
{
	GLuint program = glCreateProgram();

	std::vector<GLuint> shaders;
	if(vertexShader != 0)
		shaders.push_back(vertexShader);
	if(fragmentShader != 0)
		shaders.push_back(fragmentShader);
	if(geometryShader != 0)
		shaders.push_back(geometryShader);

	for(unsigned int i = 0; i < shaders.size(); ++i)
		glAttachShader(program, shaders[i]);

	glLinkProgram(program);

	// Check for (and print) errors
	GLint status;
	glGetProgramiv(program, GL_LINK_STATUS, &status);
	if(status == GL_FALSE)
	{
		GLint infoLogLength;
		glGetProgramiv(program, GL_INFO_LOG_LENGTH, &infoLogLength);

		GLchar *strInfoLog = new GLchar[infoLogLength + 1];
		glGetProgramInfoLog(program, infoLogLength, NULL, strInfoLog);
		std::cerr<<"Linker failure: "<<std::endl<<strInfoLog<<std::endl;
		delete[] strInfoLog;
	}

	for(unsigned int i = 0; i < shaders.size(); ++i)
		glDetachShader(program, shaders[i]);

	return program;
}