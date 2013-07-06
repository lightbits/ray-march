Goals
====
*	Rough raymarching algorithm (CPU)
Draw a circle
*	Transformations
Draw a cube
*	Render with z-buffer
*	Point light illumination
*	Move algorithm to fragment shader, use OpenGL to display results

Context creation: GLFW 3.0.2
*	http://www.glfw.org/docs/3.0/quick.html

The algorithm:
====

Ray iteration frequency graph: the more iterations the raymarching function does, the stronger color the pixel gets.
This would be quite visible around corners.

Displaying the results:
Using OpenGL, create a full screen quad, create a texture to be rendered to that quad.
Update the frame every texture, render the quad with the texture.
Render at a res lower than the window and stretch the quad

*	http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-14-render-to-texture/
*	http://www.opengl.org/sdk/docs/man2/xhtml/glDrawPixels.xml

Lighting
====
*	http://www.arcsynthesis.org/gltut/Illumination/Tutorial%2011.html
*	http://www.arcsynthesis.org/gltut/Illumination/Tutorial%2009.html
*	http://pouet.net/topic.php?which=7535
*	http://www.danknowlton.com/blog.php?id=480

Rendering techique:
Ray marching with distance fields:
*	[Presentation by iq](http://www.iquilezles.org/www/material/nvscene2008/rwwtt.pdf)
*	[Distance functions](http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm)
*	[Camera](http://sizecoding.blogspot.no/2008/12/code-for-moving-camera-in-glsl.html)
*	http://www.rpenalva.com/blog/?p=254
*	http://www.iquilezles.org/prods/index.htm
*	http://web.cs.wpi.edu/~emmanuel/courses/cs563/write_ups/zackw/realistic_raytracing.html
*	http://www.codermind.com/articles/Raytracer-in-C++-Part-I-First-rays.html
*	http://pouet.net/topic.php?which=6675&page=2
*	http://pouet.net/topic.php?which=6675&page=9
*	http://pouet.net/topic.php?which=7931&page=8
*	[Toolbox](http://pouet.net/topic.php?which=7931&page=1&x=29&y=6)
*	[Normal calculation](http://pouet.net/topic.php?which=6803)

Resources:
*	[Summary of using raytracing to solve the rendering equation](http://web.cs.wpi.edu/~emmanuel/courses/cs563/write_ups/zackw/realistic_raytracing.html)
*	[Stackoverflow](http://stackoverflow.com/questions/779550/are-there-any-rendering-alternatives-to-rasterisation-or-ray-tracing)
*	[Fragmentarium](http://syntopia.github.io/Fragmentarium/)
*	[Various examples created using Fragmentarium](http://blog.hvidtfeldts.net/)
*	[Raymarching beginner's thread](http://pouet.net/topic.php?which=7920&page=52)
*	[Basic raymarching tutorial](http://pouet.net/topic.php?which=8177&page=2)
*	[GPU gems](http://http.developer.nvidia.com/GPUGems3/gpugems3_ch34.html)

Raytracing:
*	[Codermind](http://www.codermind.com/articles/Raytracer-in-C++-Introduction-What-is-ray-tracing.html)
*	[Minilight](http://www.hxa.name/minilight/)
*	[Smallpt](http://www.kevinbeason.com/smallpt/)
*	[Smallpt presentation](https://docs.google.com/file/d/0B8g97JkuSSBwUENiWTJXeGtTOHFmSm51UC01YWtCZw/edit)