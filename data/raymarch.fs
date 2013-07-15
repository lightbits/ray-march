#version 140

// A quad is uploaded extending from -1 to 1 on both axes
// The uv variable interpolates between the quad vertices
smooth in vec2 uv;

out vec4 outColor;

// Camera
uniform vec2 g_resolution;
uniform vec3 g_camUp;
uniform vec3 g_camRight;
uniform vec3 g_camForward;
uniform vec3 g_eye;
uniform float g_focalLength;
uniform float g_zNear;
uniform float g_zFar;
uniform float g_aspectRatio;

// Raymarch parameters
uniform int g_rmSteps; // Max steps
uniform float g_rmEpsilon; // Distance threshold

// Scene
uniform vec4 g_skyColor;
uniform vec4 g_ambient;
uniform vec3 g_light0Position;
uniform vec4 g_light0Color;

// Rotates a point t radians around the y-axis
vec3 rotateY(vec3 v, float t)
{
	float cost = cos(t); float sint = sin(t);
	return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

// Rotates a point t radians around the x-axis
vec3 rotateX(vec3 v, float t)
{
	float cost = cos(t); float sint = sin(t);
	return vec3(v.x, v.y * cost - v.z * sint, v.y * sint + v.z * cost);
}

// Maps x from the range [minX, maxX] to the range [minY, maxY]
// The function does not clamp the result, as it may be useful
float mapTo(float x, float minX, float maxX, float minY, float maxY)
{
	float a = (maxY - minY) / (maxX - minX);
	float b = minY - a * minX;
	return a * x + b;
}

// Returns the signed distance to a sphere at the origin
float sdSphere(vec3 p, float radius)
{
	return length(p) - radius;
}

// Returns the unsigned distance estimate to a box at the origin of the given size
float udBox(vec3 p, vec3 size)
{
	return length(max(abs(p) - size, vec3(0.0f)));
}

// Returns the signed distance estimate to a box at the origin of the given size
float sdBox(vec3 p, vec3 size)
{
	vec3 d = abs(p) - size;
	return min(max(d.x, max(d.y, d.z)), 0.0f) + udBox(p, size);
}

// Subtracts d1 from d0, assuming d1 is a signed distance
float opSubtract(float d0, float d1)
{
	return max(d0, -d1);
}

// Defines the distance field for the scene
float distScene(vec3 p)
{
	p.xz = mod(p.xz, 1.0f) - vec2(0.5f);
	return sdBox(p - vec3(0.0f, -0.25f, 0.0f), vec3(0.25f));

	// p = rotateY(p, 0.5f * p.y);
	// float d1 = sdBox(p - vec3(0, 0.5, 0), vec3(0.5, 1.0, 0.5));
	// float d2 = sdBox(p, vec3(2.0, 0.3, 0.25));
	// return opSubtract(d1, d2);
}

// Finds the closest intersecting object along the ray at origin ro, and direction rd.
// i: step count
// t: distance traveled by the ray
void raymarch(vec3 ro, vec3 rd, out int i, out float t)
{
	t = 0.0f;
	for(i = 0; i < g_rmSteps; ++i)
	{
		float dist = distScene(ro + rd * t);

		// We make epsilon proportional to t so that we drop accuracy the further into the scene we get
		// We also drop the ray as soon as it leaves the clipping volume as defined by g_zFar
		if(dist < g_rmEpsilon * t * 2.0f || t > g_zFar)
			break;
		t += dist;
	}
}

// Returns a value between [0, 1] depending on how visible p0 is from p1
// k: denotes the soft-shadow strength
// See http://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
float getVisibility(vec3 p0, vec3 p1, float k)
{
	vec3 rd = normalize(p1 - p0);
	float t = 10.0f * g_rmEpsilon;
	float maxt = length(p1 - p0);
	float f = 1.0f;
	while(t < maxt)
	{
		float d = distScene(p0 + rd * t);

		// A surface was hit before we reached p1
		if(d < g_rmEpsilon)
			return 0.0f;

		// Penumbra factor
		f = min(f, k * d / t);

		t += d;
	}

	return f;
}

// Approximates the (normalized) gradient of the distance function at the given point.
// If p is near a surface, the function will approximate the surface normal.
vec3 getNormal(vec3 p)
{
	float h = 0.0001f;

	return normalize(vec3(
		distScene(p + vec3(h, 0, 0)) - distScene(p - vec3(h, 0, 0)),
		distScene(p + vec3(0, h, 0)) - distScene(p - vec3(0, h, 0)),
		distScene(p + vec3(0, 0, h)) - distScene(p - vec3(0, 0, h))));
}

// Calculate the light intensity with soft shadows
// p: point on surface
// lightPos: position of the light source
// lightColor: the radiance of the light source
// returns: the color of the point
vec4 getShading(vec3 p, vec3 normal, vec3 lightPos, vec4 lightColor)
{
	float intensity = 0.0f;
	float vis = getVisibility(p, lightPos, 16);
	if(vis > 0.0f)
	{
		vec3 lightDirection = normalize(lightPos - p);
		intensity = clamp(dot(normal, lightDirection), 0, 1) * vis;
	}

	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

// Compute an ambient occlusion factor
// p: point on surface
// n: normal of the surface at p
// returns: a value clamped to [0, 1], where 0 means there were no other surfaces around the point,
// and 1 means that the point is occluded by other surfaces.
float ambientOcclusion(vec3 p, vec3 n)
{
	float stepSize = 0.01f;
	float t = stepSize;
	float oc = 0.0f;
	for(int i = 0; i < 10; ++i)
	{
		float d = distScene(p + n * t);
		oc += t - d; // Actual distance to surface - distance field value
		t += stepSize;
	}

	return clamp(oc, 0, 1);
}

// Create a checkboard texture
vec4 getFloorTexture(vec3 p)
{
	vec2 m = mod(p.xz, 2.0f) - vec2(1.0f);
	return m.x * m.y > 0.0f ? vec4(0.1f) : vec4(1.0f);
}

// To improve performance we raytrace the floor
// n: floor normal
// o: floor position
float raytraceFloor(vec3 ro, vec3 rd, vec3 n, vec3 o)
{
	return dot(o - ro, n) / dot(rd, n);
}

vec4 computeColor(vec3 ro, vec3 rd)
{
	float t0;
	int i;
	raymarch(ro, rd, i, t0);

	vec3 floorNormal = vec3(0, 1, 0);
	float t1 = raytraceFloor(ro, rd, floorNormal, vec3(0, -0.5, 0));

	vec3 p; // Surface point
	vec3 normal; // Surface normal
	float t; // Distance traveled by ray from eye
	vec4 texture = vec4(1.0); // Surface texture

	if(t1 < t0 && t1 >= g_zNear && t1 <= g_zFar) // The floor was closest
	{
		t = t1;
		p = ro + rd * t1;
		normal = floorNormal;
		texture = getFloorTexture(p);
	}
	else if(i < g_rmSteps && t0 >= g_zNear && t0 <= g_zFar) // Raymarching hit a surface
	{
		t = t0;
		p = ro + rd * t0;
		normal = getNormal(p);
	}
	else
	{
		return g_skyColor;
	}

	vec4 color;
	float z = mapTo(t, g_zNear, g_zFar, 1, 0); // Map depth to [0, 1]

	// Color based on depth
	//color = vec4(1.0f) * z;

	// Diffuse lighting
	color = texture * (
		getShading(p, normal, g_light0Position, g_light0Color) +
		getShading(p, normal, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))
		) / 2.0f;

	// Color based on surface normal
	//color = vec4(abs(normal), 1.0);

	// Blend in ambient occlusion factor
	float ao = ambientOcclusion(p, normal);
	color = color * (1.0f - ao);

	// Blend the background color based on the distance from the camera
	float zSqrd = z * z;
	color = mix(g_skyColor, color, zSqrd * (3.0f - 2.0f * z)); // Fog

	return color;
}

void main()
{
	vec2 hps = vec2(1.0) / (g_resolution * 2.0);
	vec3 ro = g_eye;
	vec3 rd = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * uv.y);

	vec4 color = computeColor(ro, rd);

	// 4xAA
	//vec3 rd0 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x - hps.x) * g_aspectRatio + g_camUp * uv.y);
	//vec3 rd1 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x + hps.x) * g_aspectRatio + g_camUp * uv.y);
	//vec3 rd2 = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * (uv.y - hps.y));
	//vec3 rd3 = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * (uv.y + hps.y));

	//vec4 color = (computeColor(ro, rd0) + computeColor(ro, rd1) + computeColor(ro, rd2) + computeColor(ro, rd3)) / 4.0;

	outColor = vec4(color.xyz, 1.0f);
}