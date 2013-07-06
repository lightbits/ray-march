#ifndef COLOR_BUFFER_H
#define COLOR_BUFFER_H
#include <SFML/Graphics.hpp>
typedef unsigned char uint8;
typedef unsigned int uint32;

struct ColorBuffer
{
	ColorBuffer(uint32 width_, uint32 height_, uint8 r, uint8 g, uint8 b, uint8 a = 255) : width(width_), height(height_)
	{
		pixels = new uint8[width * height * 4];
		clear(r, g, b, a);
	}

	~ColorBuffer()
	{
		if(pixels != nullptr)
			delete[] pixels;
	}

	uint8 *pixels;
	uint32 width;
	uint32 height;

	void clear(uint8 r, uint8 g, uint8 b, uint8 a = 255)
	{
		for(uint32 i = 0; i < width * height * 4 - 4; i += 4)
		{
			pixels[i + 0] = r; 
			pixels[i + 1] = g;
			pixels[i + 2] = b; 
			pixels[i + 3] = a;
		}
	}

	void setPixel(uint32 x, uint32 y, uint8 r, uint8 g, uint8 b, uint8 a = 255)
	{
		uint32 offset = 4 * (y * width + x);
		pixels[offset + 0] = r;
		pixels[offset + 1] = g; 
		pixels[offset + 2] = b;
		pixels[offset + 3] = a;
	}

	sf::Color getPixel(uint32 x, uint32 y)
	{
		uint32 offset = y * width + x;
		return sf::Color(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]);
	}
};

#endif