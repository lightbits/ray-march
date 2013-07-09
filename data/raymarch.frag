#version 140

smooth in vec2 uv; // pixel coordinates mapped to [-1, 1] on both axes
out vec4 outColor;

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

float sdCross(vec3 p, float s)
{
	float da = sdBox(p.xyz, vec3(inf, s, s));
	float db = sdBox(p.yzx, vec3(s, inf, s));
	float dc = sdBox(p.zxy, vec3(s, s, inf));
	return min(da, min(db, dc));
}

float udXyPlane(vec3 p, float y)
{
	return abs(p.y - y);
}

// Subtracts d1 from d0, producing f1 subtracted f2, where f2 is a signed distance function.
float opSubtract(float d0, float d1)
{
	return max(d0, -d1);
}

float distScene(vec3 p)
{
	//float dx0 = sdSphere(p - vec3(0.0f, 0.2f, 0.0f), 0.6f);
	//float dx1 = udBox(p, vec3(0.55f, 0.55f, 0.55f));
	 
	//float d1 = opSubtract(dx1, dx0);
	//float d2 = udXyPlane(p, -0.55f);
	//float d3 = udBox(p - vec3(0.0f, 0.0f, 3.0f), vec3(100.0f, 0.5f, 2.0f));
	 
	//return min(d1, min(d2, d3));

	//p.xyz = mod((p.xyz), 1.0f) - vec3(0.5f);
	//float d1 = sdBox(p, vec3(0.15f));
	//float d2 = sdSphere(p, 0.3f);
	//return min(d1, d2);

	//float dx0 = sdSphere(p - vec3(0.2f, 0.3f, -0.2f), 0.5f);
	//float dx1 = sdBox(p, vec3(0.5f));
	//float d1 = max(dx1, -dx0);
	//float d2 = p.y - (-0.5f);
	//return min(d1, d2);

	float d1 = sdBox(p, vec3(0.5f));
	float d2 = sdBox(p - vec3(1.1f, 0.0f, 0.0f), vec3(0.5f));
	float d3 = sdBox(p - vec3(2.2f, 0.0f, 0.0f), vec3(0.5f));
	float d4 = p.y + 0.5f;

	return min(d1, min(d2, min(d3, d4)));
}

void raymarch(vec3 ro, vec3 rd, out int i, out vec3 p, out float t)
{
	p = ro;
	t = 0.0f;
	for(i = 0; i < g_rmSteps; ++i)
	{
		p = ro + rd * t;
		float dist = distScene(p);
		if(dist < g_rmEpsilon * t || t > g_zFar)
			break;
		t += dist;
	}
}

bool obstructed(vec3 from, vec3 to, float radius)
{
	vec3 direction = normalize(to - from);

	// We offset the start point to avoid intersecting with the surface we start from
	vec3 p = from + direction * 10.0f * g_rmEpsilon;
	for(int i = 0; i < g_rmSteps; ++i)
	{
		float dt = length(to - p);
		float d = min(distScene(p), dt);
		p += direction * d;

		if(dt < radius)
			return false;

		if(d < g_rmEpsilon)
			return true;
	}

	// Assuming we could not reach the point
	return true;
}

// Approximates the gradient of the distance function at the given point.
// If p is near a surface, the function will approximate the surface normal
// (the distance varies the most when moving normally away from the surface)
vec3 gradient(vec3 p)
{
	vec2 ep = vec2(0.0001f, 0.0f);
	float f0 = distScene(p);

	//return normalize(vec3(
	//	(distScene(p + ep.xyy) - f0) / ep.x,
	//	(distScene(p + ep.yxy) - f0) / ep.x,
	//	(distScene(p + ep.yyx) - f0) / ep.x));
	return normalize(vec3(
		(distScene(p + ep.xyy) - distScene(p - ep.xyy)) / (2.0f * ep.x),
		(distScene(p + ep.yxy) - distScene(p - ep.yxy)) / (2.0f * ep.x),
		(distScene(p + ep.yyx) - distScene(p - ep.yyx)) / (2.0f * ep.x)));
}

vec4 diffuseS(vec3 p, vec3 lightPos, vec4 lightColor)
{
	float intensity = 0.0f;
	if(!obstructed(p, lightPos, 0.1f))
	{
		vec3 surfaceNormal = gradient(p);
		vec3 lightDirection = normalize(lightPos - p);
		intensity = clamp(dot(surfaceNormal, lightDirection), 0, 1);
	}

	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

vec4 diffuseNS(vec3 p, vec3 lightPos, vec4 lightColor)
{
	float cost = dot(gradient(p), normalize(lightPos - p)); // Angle of incidence
	float intensity = clamp(cost, 0, 1);
	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

void main()
{
	vec3 ro = g_eye;
	vec3 rd = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * uv.y);

	vec3 p;
	float t;
	int i;
	raymarch(ro, rd, i, p, t);

	vec4 color = g_skyColor;

	// Color the pixel if we hit a surface (assumingly) inside the clip-space
	if(i < g_rmSteps && t > g_zNear && t < g_zFar)
	{
		// The distance traveled by the ray mapped to [0, 1], not clamped
		float z = mapTo(t, g_zNear, g_zFar, 1, 0);

		// Color depth relative to eye
		//color = z < 0.0f || z > 1.0f ? g_skyColor : vec4(1.0f) * z;

		// Diffuse lighting
		color = (diffuseS(p, g_light0Position, g_light0Color) + diffuseS(p, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))) * 0.5f;

		// Color based on surface gradient
		//color = vec4(abs(gradient(p)).xyz, 1.0f);

		// Blend the background color based on the distance from the camera
		color = mix(g_skyColor, color, 3.0f * z * z - 2.0f * z * z * z); // Fog
	}

	outColor = vec4(color.xyz, 1.0f);
}