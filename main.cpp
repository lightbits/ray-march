#include <iostream>
#include <SFML/Graphics.hpp>
#include "colorbuffer.h"
#include "vec.h"

// Image plane
// The camera is looking down the positive z-axis
vec3 g_camUp = normalize(vec3(0.0f, 1.0f, 0.5f));
vec3 g_camRight = normalize(vec3(1.0f, 0.0f, 0.0f));
vec3 g_camForward = cross(g_camRight, g_camUp);
vec3 g_eye = vec3(0.0f, 0.0f, -1.0f);

const float g_zNear = -0.7f;
const float g_zFar = 0.4f;

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

float udBox1(const vec3 &p, const vec3 &size)
{
	static const float cost0 = cosf(0.35f);
	static const float sint0 = sinf(0.35f);
	static const float cost1 = cosf(0.5f);
	static const float sint1 = sinf(0.5f);
	vec3 temp = vec3(p.x * cost0 + p.z * sint0, p.y, -p.x * sint0 + p.z * cost0);
	return udBox(vec3(temp.x, temp.y * cost1 - temp.z * sint1, temp.y * sint1 + temp.z * cost1), size);
}

float udXyPlane(const vec3 &p, float y)
{
	return std::abs(p.y - y);
}

float distScene(const vec3 &p/*, vec4 &color*/)
{
	float d0 = sdSphere(p - vec3(-0.25f, 0.0f, 0.0f), 0.3f);
	float d1 = sdSphere(p - vec3(0.25f, 0.0f, 0.0f), 0.2f);
	float d2 = udBox(p - vec3(0.0f, -0.8f, 0.0f), vec3(0.8f, 0.6f, 0.2f));
	float d3 = udBox1(p, vec3(0.25f, 0.25f, 0.25f));
	float d4 = udXyPlane(p, -1.4f);

	return min(d0, min(d1, min(d2, min(d3, d4))));
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
	int step = 0;
	while(step < maxSteps)
	{
		float d = distScene(p + direction * t);
		//const float epsilon = 1e-3;
		const float epsilon = 0.009f;
		if(d < epsilon)
		{
			float z = mapTo((p + direction * t).z, g_zNear, g_zFar, 1.0f, 0.0f);
			return z < 0.0f || z > 1.0f ? g_skyColor : vec4(1.0f) * z;
		}

		t += d;
		++step;
	}

	return g_skyColor;

	//const float MAX_DIST = 9999.f;
	//float d0 = MAX_DIST;
	//float d = d0;
	//float t = 0.0f;
	//// Bail out when the distance to everything starts to increase (works for convex shapes)
	//while(d <= d0)
	//{
	//	d = distScene(p + direction * t);
	//	const float epsilon = 1e-3;
	//	if(d < epsilon)
	//	{
	//		float z = mapTo((p + direction * t).z, g_zFar, g_zNear, 1.0f, 0.0f);
	//		if(z < 0.0f || z > 1.0f)
	//			return g_skyColor;
	//		else
	//			return vec4(1.0f, 1.0f, 1.0f, 1.0f) * z;
	//	}

	//	t += d;
	//	d0 = d;
	//}
}

void renderScene(ColorBuffer &buffer)
{
	for(uint32 imgY = 0; imgY < buffer.height; ++imgY)
	{
		for(uint32 imgX = 0; imgX < buffer.width; ++imgX)
		{
			// Map image to a plane in the world perpendicular to the z-axis,
			// extending from -1 to 1 on both the x and y axis
			float u = 2.0f * imgX / static_cast<float>(buffer.width) - 1.0f;
			float v = -(2.0f * imgY / static_cast<float>(buffer.height) - 1.0f);

			// Generate ray starting at the image plane and pointing down the camera direction
			vec3 p = g_eye + g_camRight * u + g_camUp * v;
			vec3 d = g_camForward;

			vec4 color = raymarch(p, d, 40);
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
	std::cout<<"eye:\t"<<g_eye<<std::endl;
	std::cout<<"cam up:\t"<<g_camUp<<std::endl;
	std::cout<<"cam rht:\t"<<g_camRight<<std::endl;
	std::cout<<"cam fwd:\t"<<g_camForward<<std::endl;

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

	/*
	Take backup!
	*/

	sf::RenderWindow window(sf::VideoMode(windowWidth, windowHeight), "Raymarching with Distance fields", sf::Style::Titlebar | sf::Style::Close);
	while(window.isOpen())
	{
		sf::Event event;
		while(window.pollEvent(event))
		{
			if(event.type == sf::Event::Closed)
				window.close();
		}

		window.clear(sf::Color(0, 0, 0));

		if(clock.getElapsedTime().asSeconds() - lastRender >= 30.0f)
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