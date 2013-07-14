#version 140

smooth in vec2 uv; // pixel coordinates mapped to [-1, 1] on both axes
out vec4 outColor;

uniform vec2 g_resolution;
uniform vec3 g_camUp;
uniform vec3 g_camRight;
uniform vec3 g_camForward;
uniform vec3 g_eye;
uniform float g_focalLength;
uniform float g_zNear;
uniform float g_zFar;
uniform float g_aspectRatio;
uniform int g_rmSteps;
uniform float g_rmEpsilon;

uniform vec4 g_skyColor;
uniform vec4 g_ambient;
uniform vec3 g_light0Position;
uniform vec4 g_light0Color;

float inf = 9999.9;

vec3 rotateY(vec3 v, float t)
{
	float cost = cos(t); float sint = sin(t);
	return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

vec3 rotateX(vec3 v, float t)
{
	float cost = cos(t); float sint = sin(t);
	return vec3(v.x, v.y * cost - v.z * sint, v.y * sint + v.z * cost);
}

float mapTo(float x, float minX, float maxX, float minY, float maxY)
{
	float a = (maxY - minY) / (maxX - minX);
	float b = minY - a * minX;
	return a * x + b;
}

float sdSphere(vec3 p, float radius)
{
	return length(p) - radius;
}

float udBox(vec3 p, vec3 size)
{
	return length(max(abs(p) - size, vec3(0.0f)));
}

float sdBox(vec3 p, vec3 size)
{
	vec3 d = abs(p) - size;
	return min(max(d.x, max(d.y, d.z)), 0.0f) + udBox(p, size);
}

float sdCylinderX(vec3 p, float r, float l)
{
	return max(length(p.yz) - r, abs(p.x) - l);
}

float sdCylinderY(vec3 p, float r, float h)
{
	return max(length(p.xz) - r, abs(p.y) - h);
}

// Subtracts d1 from d0, producing f1 subtracted f2, where f2 is a signed distance function.
float opSubtract(float d0, float d1)
{
	return max(d0, -d1);
}

float distScene(vec3 p)
{
	return length(p) - 0.5f;
	//float d1 = sdSphere(p, 0.5f);
	//float d2 = sdBox(p - vec3(1.0f, 0.0f, 0.0f), vec3(0.45f));
	//float d3 = opSubtract(sdCylinderX(p - vec3(0.0f, 0.1f, 0.0f), 1.0f, 2.0f), sdCylinderX(p, 0.9f, 2.5f));
	//return min(d1, min(d2, d3));
}

void raymarch(vec3 ro, vec3 rd, out int i, out vec3 p, out float t)
{
	p = ro;
	t = 0.0f;
	for(i = 0; i < g_rmSteps; ++i)
	{
		p = ro + rd * t;
		float dist = distScene(p);
		// We make epsilon proportional to t so that we drop accuracy the further into the scene we get
		if(dist < g_rmEpsilon * t * 2.0f || t > g_zFar)
			break;
		t += dist;
	}
}

// Returns a value between [0, 1] depending on how visible p0 is from p1
float visibility(vec3 p0, vec3 p1, float k)
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
vec3 gradient(vec3 p)
{
	vec2 eps = vec2(0.0001f, 0);

	return normalize(vec3(
		distScene(p + eps.xyy) - distScene(p - eps.xyy),
		distScene(p + eps.yxy) - distScene(p - eps.yxy),
		distScene(p + eps.yyx) - distScene(p - eps.yyx)));
}

/* Calculate the light intensity with soft shadows
p: point on surface
lightPos: position of the light source
lightColor: the radiance of the light source
returns: the color of the point
*/
vec4 diffuseS(vec3 p, vec3 normal, vec3 lightPos, vec4 lightColor)
{
	float intensity = 0.0f;
	float vis = visibility(p, lightPos, 16);
	if(vis > 0.0f)
	{
		vec3 lightDirection = normalize(lightPos - p);
		intensity = clamp(dot(normal, lightDirection), 0, 1) * vis;
	}

	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

/* Calculate the light intensity without shadows
p: point on surface
lightPos: position of the light source
lightColor: the radiance of the light source
returns: the color of the point
*/
vec4 diffuseNS(vec3 p, vec3 lightPos, vec4 lightColor)
{
	float cost = dot(gradient(p), normalize(lightPos - p)); // Angle of incidence
	float intensity = clamp(cost, 0, 1);
	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

/* Compute an ambient occlusion factor
p: point on surface
n: normal of the surface at p
returns: a value clamped to [0, 1], where 0 means there were no other surfaces around the point,
and 1 means that the point is occluded by other surfaces.
*/
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

vec4 getFloorAbsorption(vec3 p)
{
	vec2 m = mod(p.xz, 2.0f) - vec2(1.0f);
	return m.x * m.y > 0.0f ? vec4(0.1f) : vec4(1.0f);
}

vec4 raytraceFloor(vec3 ro, vec3 rd, vec3 n, vec3 o)
{
	float t = dot(o - ro, n) / dot(rd, n);
	if(t < 0.0f || t > g_zFar)
		return g_skyColor;

	float z = mapTo(t, g_zNear, g_zFar, 1, 0);

	vec3 p = ro + rd * t;
	vec4 color = (
			diffuseS(p, n, g_light0Position, g_light0Color) +
			diffuseS(p, n, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))
			) / 2.0f;

	color *= getFloorAbsorption(p);

	float ao = ambientOcclusion(p, n);
	color = color * (1.0f - ao);

	float zSqrd = z * z;
	color = mix(g_skyColor, color, zSqrd * (3.0f - 2.0f * z)); // Fog

	return color;
}

vec4 getReflection(vec3 ro, vec3 rd)
{
	vec4 color = g_skyColor;

	vec3 p;
	float t;
	int i;
	raymarch(ro, rd, i, p, t);

	// We hit a surface inside the clip-volume
	if(i < g_rmSteps && t > g_zNear && t < g_zFar)
	{
		// The distance traveled by the ray mapped to [0, 1], not clamped
		float z = mapTo(t, g_zNear, g_zFar, 1, 0);

		// Color based on depth
		//color = vec4(1.0f) * z;

		// Approximate surface normal
		vec3 normal = gradient(p);

		// Diffuse lighting
		color = (
			diffuseS(p, normal, g_light0Position, g_light0Color) +
			diffuseS(p, normal, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))
			) / 2.0f;

		// Color based on surface gradient
		//color = vec4(abs(gradient(p)).xyz, 1.0f);

		// Color based on ambient occlusion
		float ao = ambientOcclusion(p, normal);
		color = color * (1.0f - ao);

		// Blend the background color based on the distance from the camera
		float zSqrd = z * z;
		color = mix(g_skyColor, color, zSqrd * (3.0f - 2.0f * z)); // Fog
	}
	else
	{
		color = raytraceFloor(ro, rd, vec3(0, 1, 0), vec3(0, -0.5f, 0));
	}

	return color;
}

vec4 getColor(vec3 ro, vec3 rd)
{
	vec4 color = g_skyColor;

	vec3 p;
	float t;
	int i;
	raymarch(ro, rd, i, p, t);

	// We hit a surface inside the clip-volume
	if(i < g_rmSteps && t > g_zNear && t < g_zFar)
	{
		// The distance traveled by the ray mapped to [0, 1], not clamped
		float z = mapTo(t, g_zNear, g_zFar, 1, 0);

		// Color based on depth
		//color = vec4(1.0f) * z;

		// Approximate surface normal
		vec3 normal = gradient(p);

		// Diffuse lighting
		color = (
			diffuseS(p, normal, g_light0Position, g_light0Color) +
			diffuseS(p, normal, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))
			) / 2.0f;

		color = mix(color, getReflection(p, normal), 0.3f);

		// Color based on surface gradient
		//color = vec4(abs(gradient(p)).xyz, 1.0f);

		// Color based on ambient occlusion
		float ao = ambientOcclusion(p, normal);
		color = color * (1.0f - ao);

		// Blend the background color based on the distance from the camera
		float zSqrd = z * z;
		color = mix(g_skyColor, color, zSqrd * (3.0f - 2.0f * z)); // Fog
	}
	else
	{
		color = raytraceFloor(ro, rd, vec3(0, 1, 0), vec3(0, -0.5f, 0));
	}

	return color;
}

void main()
{
	vec3 ro = g_eye;
	vec3 rd = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * uv.y);
	vec4 color = getColor(ro, rd);

	outColor = vec4(color.xyz, 1.0f);
}