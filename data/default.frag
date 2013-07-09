#version 140

in vec2 vertTexel;
in vec4 vertColor;

out vec4 fragColor;

uniform sampler2D tex;
// uniform float texBlend;

void main()
{
	fragColor = texture(tex, vertTexel);
	// fragColor = mix(vertColor, texture(tex, vertTexel), texBlend);
}