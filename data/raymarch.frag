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

float sdCylinderY(vec3 p, float r, float h)
{
	return max(length(p.xz) - r, abs(p.y) - h);
}

float sdHemiTop(vec3 p, float r)
{
	return max(length(p) - r, -p.y);
}

float sdHemiBottom(vec3 p, float r)
{
	return max(length(p) - r, p.y);
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

void rotate1(inout float x, inout float y, inout float z)
{
	const float cost = cos(0.9f);
	const float sint = sin(0.9f);
	float y1 = y * cost - z * sint;
	float z1 = y * sint + z * cost;
	y = y1; z = z1;
}

void rotate2(inout float x, inout float y, inout float z)
{
	const float cost = cos(0.6f);
	const float sint = sin(0.6f);
	float y1 = y * cost - z * sint;
	float z1 = y * sint + z * cost;
	y = y1; z = z1;
}

float sierpinski3(float x, float y, float z)
{
	vec3 C = vec3(0.60f, 0.3, 0.70f);
	float scale = 2.0f;
	int bailout = 100;
	float r = x * x + y * y + z * z;
	int i = 0;
	while(i < 10 && r < bailout)
	{
		rotate1(x, y, z);
		if(x + y < 0) { float x1 = -y; y = -x; x = x1; }
		if(x + z < 0) { float x1 = -z; z = -x; x = x1; }
		if(y + z < 0) { float y1 = -z; z = -y; y = y1; }

		rotate2(x, y, z);
		x = scale * x - C.x * (scale - 1);
		y = scale * y - C.y * (scale - 1);
		z = scale * z - C.z * (scale - 1);
		r = x * x + y * y + z * z;
		++i;
	}

	return (sqrt(r) - 2) * pow(scale, -i);
}

float distScene(vec3 p)
{
	//float d1 = p.y + 0.5f;
	float d1 = sdBox(p - vec3(0.0f, -1.0f, 0.0f), vec3(2.0f, 0.5f, 2.0f));
	float d2 = sdSphere(p, 0.5f);
	float d3 = sdBox(p - vec3(1.0f, 0.0f, 0.0f), vec3(0.45f));
	return min(d1, min(d2, d3));
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
	float h = 0.0001f;

	//vec2 ep = vec2(0.0001f, 0.0f);
	//return normalize(vec3(
	//	distScene(p + ep.xyy) - distScene(p - ep.xyy),
	//	distScene(p + ep.yxy) - distScene(p - ep.yxy),
	//	distScene(p + ep.yyx) - distScene(p - ep.yyx)));

	return normalize(vec3(
		distScene(p + vec3(h,0,0)) - distScene(p - vec3(h,0,0)),
		distScene(p + vec3(0,h,0)) - distScene(p - vec3(0,h,0)),
		distScene(p + vec3(0,0,h)) - distScene(p - vec3(0,0,h))));
}

vec4 diffuseS(vec3 p, vec3 lightPos, vec4 lightColor)
{
	float intensity = 0.0f;
	float vis = visibility(p, lightPos, 16);
	if(vis > 0.0f)
	{
		vec3 surfaceNormal = gradient(p);
		vec3 lightDirection = normalize(lightPos - p);
		intensity = clamp(dot(surfaceNormal, lightDirection), 0, 1) * vis;
	}

	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

vec4 diffuseNS(vec3 p, vec3 lightPos, vec4 lightColor)
{
	float cost = dot(gradient(p), normalize(lightPos - p)); // Angle of incidence
	float intensity = clamp(cost, 0, 1);
	return lightColor * intensity + g_ambient * (1.0f - intensity);
}

// Returns a value between 0 and 1, where 0 means the surface point is not occluded
// and 1 means the point is completely occluded.
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

vec4 getColor(vec3 ro, vec3 rd)
{
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
		color = z < 0.0f || z > 1.0f ? g_skyColor : vec4(1.0f) * z;

		// Diffuse lighting
		//color = (diffuseS(p, g_light0Position, g_light0Color) + diffuseS(p, vec3(2.0f, 1.0f, 0.0f), vec4(1.0f, 0.5f, 0.5f, 1.0f))) * 0.5f;

		// Color based on surface gradient
		//color = vec4(clamp(gradient(p), 0, 1).xyz, 1.0f); // Only upward pointing normals
		//color = vec4(abs(gradient(p)).xyz, 1.0f);

		// Color based on ambient occlusion
		vec3 normal = gradient(p);
		float ao = ambientOcclusion(p, normal);
		color = color * (1.0f - ao);

		// Blend the background color based on the distance from the camera
		float zSqrd = z * z;
		color = mix(g_skyColor, color, zSqrd * (3.0f - 2.0f * z)); // Fog
	}

	return color;
}

void main()
{
	float imgWidth = 480.0f;
	float imgHeight = 480.0f;
	float hpw = 1.0f / (2 * imgWidth);
	float hph = 1.0f / (2 * imgHeight);
	vec3 ro = g_eye;
	vec3 rd = normalize(g_camForward * g_focalLength + g_camRight * uv.x * g_aspectRatio + g_camUp * uv.y);
	vec4 color = getColor(ro, rd);
	//vec3 rd1 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x - hpw) + g_camUp * (uv.y - hph));
	//vec3 rd2 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x + hpw) + g_camUp * (uv.y - hph));
	//vec3 rd3 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x + hpw) + g_camUp * (uv.y + hph));
	//vec3 rd4 = normalize(g_camForward * g_focalLength + g_camRight * (uv.x - hpw) + g_camUp * (uv.y + hph));

	//vec4 color = (getColor(ro, rd1) + getColor(ro, rd2) + getColor(ro, rd3) + getColor(ro, rd4)) / 4.0f;

	outColor = vec4(color.xyz, 1.0f);
}