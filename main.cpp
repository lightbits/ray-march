#include <iostream>
#include <SFML/Graphics.hpp>
#include "colorbuffer.h"
#include "vec.h"

// Camera
vec3 g_camUp = normalize(vec3(0.0f, 1.0f, 0.8f));		// The upward-vector of the image plane
vec3 g_camRight = normalize(vec3(1.0f, 0.0f, 0.0f));	// The right-vector of the image plane
vec3 g_camForward = cross(g_camRight, g_camUp);			// The (calculated) forward vector of the image plane
vec3 g_eye = vec3(0.0f, 0.8f, -1.5f);					// The eye position in the world
float g_focalLength = 1.2f;								// Distance between eye and image-plane

// Z-bounds, geometry outside of this range will be rendered as g_skyColor
const float g_zNear = -1.6f;
const float g_zFar = 0.7f;

// Scene
vec4 g_skyColor(0, 0, 0, 1.0f);
vec4 g_color0(1.0f, 0.4f, 0.4f, 1.0f);
vec4 g_color1(0.4f, 1.0f, 0.4f, 1.0f);
vec4 g_color2(0.4f, 0.4f, 0.95f, 1.0f);
vec4 g_color3(1.0f, 1.0f, 0.4f, 1.0f);

float min(float x, float y) { return x < y ? x : y; }
float max(float x, float y) { return x > y ? x : y; }
float clamp(float x, float minX, float maxX) { return min(max(x, minX), maxX); }

// Maps the given x from the range [minX, maxX] to the range [minY, maxY]
float mapTo(float x, float minX, float maxX, float minY, float maxY)
{
	float a = (maxY - minY) / (maxX - minX);
	float b = minY - a * minX;
	return a * x + b;
}

float sdSphere(const vec3 &p, float radius)
{
	return length(p) - radius;
}

float udBox(const vec3 &p, const vec3 &size)
{
	return length(max(abs(p) - size, vec3(0.0f, 0.0f, 0.0f)));
}

float udXyPlane(const vec3 &p, float y)
{
	return std::abs(p.y - y);
}

// Subtracts d1 from d0, producing f1 subtracted f2, where f2 is a signed distance function.
float opSubtract(float d0, float d1)
{
	return max(d0, -d1);
}

float distScene(const vec3 &p/*, vec4 &color*/)
{
	/*float d0 = sdSphere(p - vec3(-0.25f, 0.0f, 0.0f), 0.3f);
	float d1 = sdSphere(p - vec3(0.25f, 0.0f, 0.0f), 0.2f);
	float d2 = udBox(p - vec3(0.0f, -0.8f, 0.0f), vec3(0.8f, 0.6f, 0.6f));
	float d3 = udBox1(p, vec3(0.25f, 0.25f, 0.25f));
	float d4 = udXyPlane(p, -1.4f);*/

	float dx0 = sdSphere(p - vec3(0.37f, 0.4f, -0.3f), 0.37f);
	float dx1 = udBox(p, vec3(0.55f, 0.55f, 0.55f));

	float d1 = opSubtract(dx1, dx0);
	float d2 = udXyPlane(p, -0.55f);

	return min(d1, d2);

	//return min(d0, min(d1, min(d2, min(d3, d4))));
}

/*
p: Starting point for the ray
direction: The direction of the ray
maxSteps: Maximum ray-steps before bailout (TODO: replace with clever algorithm for detecting increasing distance)
Returns: The color of the hit surface or the sky color if nothing was hit
*/
vec4 raymarch(const vec3 &p, const vec3 &direction, int maxSteps)
{
	float t = 0.0f;
	for(int i = 0; i < maxSteps; ++i)
	{
		float d = distScene(p + direction * t);
		const float epsilon = 0.005f;
		if(d < epsilon)
		{
			float z = mapTo((p + direction * t).z, g_zNear, g_zFar, 1.0f, 0.0f);
			return z < 0.0f || z > 1.0f ? g_skyColor : vec4(1.0f) * z;
		}

		t += d;
	}

	return g_skyColor;
}

void renderScene(ColorBuffer &buffer)
{
	for(uint32 imgY = 0; imgY < buffer.height; ++imgY)
	{
		for(uint32 imgX = 0; imgX < buffer.width; ++imgX)
		{
			// Map pixels to [-1, 1] square
			// The top-right corner of the window maps to (1, 1), and the bottom-left maps to (-1, -1) in uv-coordinates
			float u = 2.0f * imgX / static_cast<float>(buffer.width) - 1.0f;
			float v = -(2.0f * imgY / static_cast<float>(buffer.height) - 1.0f);

			/* Orthographic projection:
			===========================
			Rays are simply cast perpendicular of the image plane.
			*/
			/*vec3 p = g_eye + g_camRight * u + g_camUp * v;
			vec3 d = g_camForward;*/

			/* Perspective projection:
			===========================
			Image plane position = s = eye + focalLength * (right x up) + u * right + v * up
			Ray starting point = eye
			Ray direction = d = s - eye = focalLength * (right x up) + u * right + v * up
			Finally we normalize d
			*/
			vec3 p = g_eye;
			vec3 d = normalize(g_camForward * g_focalLength + g_camRight * u + g_camUp * v);

			vec4 color = raymarch(p, d, 24);
			buffer.setPixel(imgX, imgY, uint8(color.x * 255), uint8(color.y * 255), uint8(color.z * 255));
		}
	}
}

std::ostream &operator<<(std::ostream &lhs, const vec3 &rhs)
{
	lhs<<"("<<rhs.x<<" "<<rhs.y<<" "<<rhs.z<<")";
	return lhs;
}

int main(int argc, char **argv)
{
	std::cout<<"eye position:\t"<<g_eye<<std::endl;
	std::cout<<"cam upward:\t"<<g_camUp<<std::endl;
	std::cout<<"cam right:\t"<<g_camRight<<std::endl;
	std::cout<<"cam forward:\t"<<g_camForward<<std::endl;

	const uint32 windowWidth = 480;
	const uint32 windowHeight = 480;
	const uint32 imageWidth = 120;
	const uint32 imageHeight = 120;
	ColorBuffer buffer(imageWidth, imageHeight, 0, 0, 0);

	buffer.setPixel(60, 60, 255, 100, 100);

	sf::Texture rt;
	rt.create(imageWidth, imageHeight);

	sf::Clock clock;
	float renderInterval = 30.0f;
	float lastRender = -renderInterval;
	sf::RenderWindow window(sf::VideoMode(windowWidth, windowHeight), "Raymarching Distance fields", sf::Style::Titlebar | sf::Style::Close);
	while(window.isOpen())
	{
		sf::Event event;
		while(window.pollEvent(event))
		{
			if(event.type == sf::Event::Closed)
				window.close();
			else if(event.type == sf::Event::KeyPressed && event.key.code == sf::Keyboard::R)
			{
				float ex, ey, ez, ux, uy, uz, rx, ry, rz, f;
				std::cout<<"(e_x e_y e_z) (up_x up_y up_z) (right_x right_y right_z) focal_length:";
				std::cin>>ex>>ey>>ez>>ux>>uy>>uz>>rx>>ry>>rz>>f;
				g_eye = vec3(ex, ey, ez);
				g_camUp = normalize(vec3(ux, uy, uz));
				g_camRight = normalize(vec3(rx, ry, rz));
				g_camForward = cross(g_camRight, g_camUp);
				lastRender = clock.getElapsedTime().asSeconds() - renderInterval; // Force redraw
			}
		}

		window.clear(sf::Color(0, 0, 0));

		if(clock.getElapsedTime().asSeconds() - lastRender >= renderInterval)
		{
			lastRender = clock.getElapsedTime().asSeconds();
			renderScene(buffer);

			rt.update(buffer.pixels);
		}

		sf::Sprite sprite;
		sprite.setTexture(rt);
		sprite.setScale(windowWidth / static_cast<float>(imageWidth), windowHeight / static_cast<float>(imageHeight));
		window.draw(sprite);

		window.display();
		sf::sleep(sf::milliseconds(13));
	}

	return 0;
}