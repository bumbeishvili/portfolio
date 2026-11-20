---
title: "Self-Assembling Burger"
year: 2026
tags: [three.js, webgl, 3d, blender, python, shaders, 3d modeling, 3d rendering, 3d animation, animation, baking]
subtitle: "Three.js, GLSL, Blender, Python"
description: "The same burger animation built three ways, to compare plain Three.js with builds baked in the browser and in Blender."
featured_image: '/images/projects/self-assembling-burger/thumbnail.mp4'
---

<div style="margin-bottom:60px;overflow:hidden;width:100%;display:flex;justify-content:center">
<video style="width:100%;max-width:960px;" poster="/images/projects/self-assembling-burger/poster.webp" autoplay loop muted playsinline>
  <source src="/images/projects/self-assembling-burger/video.mp4" type="video/mp4">
</video>
</div>

The same burger animation built three ways, to compare the technologies. All three run in the browser and turn together when you drag one of them.

| | Plain Three.js | Code and shaders | Blender |
|---|---|---|---|
| Shapes | Three.js shapes put together by hand | Generated in code | Modelled in Blender by a Python script |
| Materials | Standard Three.js materials | Painted by shaders | Blender materials baked to textures |
| Light | Live lights | Path traced in the browser, then baked | Baked by Cycles |
| Size | About 20 KB | About 9 MB, nearly all of it two photographs | About 26 MB |

<div class="gallery" data-columns="3">
	<img src="/images/projects/self-assembling-burger/1.webp">
	<img src="/images/projects/self-assembling-burger/2.webp">
	<img src="/images/projects/self-assembling-burger/3.webp">
</div>

The Blender scene was also rendered as a film with Cycles.

<div style="margin-bottom:60px;overflow:hidden;width:100%;display:flex;justify-content:center">
<video style="width:100%;max-width:960px;" poster="/images/projects/self-assembling-burger/film.webp" autoplay loop muted playsinline>
  <source src="/images/projects/self-assembling-burger/film.mp4" type="video/mp4">
</video>
</div>
