#version 140

in vec2 position;
smooth out vec2 uv;

void main()
{
	uv = position;
	gl_Position = vec4(position.xy, 0.0f, 1.0f);
}