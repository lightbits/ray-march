/*
Provides functions for context creation and destruction, as well as OpenGL helper functions such
as compiling shaders and GLSL programs.
*/

#include <glload/gl_3_1_comp.h> // OpenGL version 3.1, compatability profile
#include <glload/gll.hpp>		// The C-style loading interface
#include <GL/glfw.h>			// Context
#include <glm/glm.hpp>			// OpenGL mathematics
#include <glm/gtc/type_ptr.hpp> // for value_ptr(matrix)
#include <string>

const int OPENGL_VERSION_MAJOR = 3;
const int OPENGL_VERSION_MINOR = 1; 

bool createContext(const char *title, int w, int h, int depthbits, int stencilbits, int fsaa, bool fullscreen);
void destroyContext();
GLuint compileShader(GLenum shaderType, GLsizei count, const std::string &shaderSrc);
GLuint createProgram(GLuint vertexShader, GLuint fragmentShader, GLuint geometryShader = 0);