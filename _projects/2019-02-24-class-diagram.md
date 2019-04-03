---
top: interactive
layout: post
comments: true
title: 'Datastax - class diagram'
subtitle: 'd3.js, react, graphql'
date: 2019-02-24 00:00:00
description:  Class diagram 
featured_image: '/images/projects/datastax/thumbnail.png'
---

<iframe src="https://bumbeishvili.github.io/d3-matthias-upw/classdiagram/?file=c360-template" style="border:0px #ffffff none;" name="myiFrame" scrolling="no" frameborder="1" marginheight="0px" marginwidth="0px" height="600px" width="100%" allowfullscreen></iframe>

![](/images/projects/datastax/disney.png)

Diagram had several requirements:
1. Should be looking as clean as possible 
1. Should be zoomable and pannable
1. Collapsible and Draggable nodes
1. Should be able to work with graphql source file
1. After each interaction, layout should be saved in browser


I used

**d3.js**  - for drawing

**d3-dag**  -  to calculate optimal positioning of nodes. Most helpful was topological layout

**Crow's foot notations** -  to display relationship multiplicity

**Graphql tag** - to parse graphql files







![](/images/projects/datastax/gif.gif)


End product is very smooth and pretty performant, compared to built in tools in several applications  (Eyes towards you, visual studio and your entity relationship diagram)


<br/><br/><br/>

