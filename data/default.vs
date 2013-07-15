#version 140

in vec3 position;
in vec2 texel;
in vec4 color;

out vec2 vertTexel;
out vec4 vertColor;

void main()
{
	vertTexel = texel;
	vertColor = color;
	gl_Position = vec4(position.xyz, 1.0f);
}