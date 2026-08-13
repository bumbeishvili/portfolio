---
comments: true
layout: post
title: First place at Hacktoberfest Tbilisi
date: 2025-10-19 00:00:00
language: 
description: Won first place at Georgia's largest hackathon with FlipMyRoom
featured_image: '/images/blogs/hacktoberfest/stage.jpg'
---

![](/images/blogs/hacktoberfest/stage.jpg)

Hacktoberfest Tbilisi ran for 48 hours on October 18–19 2025 at the Free University campus — the largest hackathon held in Georgia, powered by Lovable together with DevTherapy and Four Loop Pod. Over 100 projects were built across the weekend.

![](/images/blogs/hacktoberfest/crowd.jpg)

Beqa and I built **FlipMyRoom**, and we took first place.

It's a widget for building material shops. A customer looking at tiles or flooring uploads a photo of their own room, brushes over the area they want changed, and gets it back re-rendered with that exact product. For the shop it's a script tag and a data attribute on the button — nothing else to integrate.

<div class="gallery" data-columns="2">
	<img src="/images/blogs/hacktoberfest/before.png">
	<img src="/images/blogs/hacktoberfest/after.png">
</div>

We started on facades — siding and roofing, seen from outside the house. Around midday on the first day we moved indoors instead. Interiors are what people actually browse online, and the surfaces are easier to get convincing.

![](/images/blogs/hacktoberfest/team.jpg)

Google's Nano Banana does the image transform. Claude writes the prompt that goes into it, which turned out to matter more than expected — the same photo and the same texture give you very different results depending on how the instruction is phrased. The landing page was built in Lovable, with a small Node backend behind it.

For the demo we didn't build a fake shop. We took a real product page from [nova.ge](https://nova.ge) and dropped our button into it, so what the judges saw was the widget sitting on a storefront that already exists.

<br/><br/><br/>
