---
top: 
layout: post
comments: true
title: 'Dtone - Firing Map'
subtitle: 'd3.js'
date: 2019-03-26 00:00:00
description:  Class diagram 
featured_image: '/images/projects/dtone/thumbnail.png'
---



![](/images/projects/dtone/preview.gif)

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







<br/><br/><br/>

