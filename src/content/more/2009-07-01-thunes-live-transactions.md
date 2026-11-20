---
title: 'Thunes & DT One - Live transactions map'
year: 2019
tags: [d3.js, map, dashboard, finance, data visualization, real-time]
subtitle: 'd3.js'
description: "World map of live transactions for Thunes and DT One, built with d3.js."
featured_image: '/images/projects/thunes-live-transactions/thumbnail.mp4'
---

<div style="margin-bottom:60px;overflow:hidden;width:100%;display:flex;justify-content:center">
<video style="width:100%;max-width:960px;" poster="/images/projects/thunes-live-transactions/poster.webp" autoplay loop muted playsinline>
  <source src="/images/projects/thunes-live-transactions/video.mp4" type="video/mp4">
</video>
</div>

This map displays  several types of live transactions

We have domestic and cross country transactions, which are displayed as
lines and circles respectively.

Transactions themselves can be money transfer, digital value and airtime credit, those can be differentiated with colors.

These transactions, also can be processed using mobile, bank account or cash pickup, we can see corresponding icons displaying this data on the map as well

---
I used **d3.js and SVG**  - for drawing

Most challenging part was performance

Because of huge count of records, I had to process up to **million records** in every 4-5 second  on **client side**.

That caused notable delays in lines and points transition . To overcome this, we have sorted data by date and maintained indexes of last used records, that reduced average records count to process, from **500,000**  to **100** 

That said, instead of pushing svg to it's performance limits, in long term, I am thinking to do this kind of interactive things in canvas, it'll be interesting to see how will svg compare, in terms of performance, with canvas in this kind of situations

<div class="gallery" data-columns="3" data-shots>
	<img src="/images/projects/thunes-live-transactions/shot-1.webp">
	<img src="/images/projects/thunes-live-transactions/shot-2.webp">
	<img src="/images/projects/thunes-live-transactions/shot-3.webp">
</div>
