---
layout: tool
comments: true
title: Apply Color Palette to svg
subtitle: 'd3.js'
date: 2019-9-22 00:00:00
description:  .
featured_image: '/images/tools/palette-color-transfer.png'
---
<style>

</style> 
<div class='rewind-wrapper'>


<div id="fb-root"></div>
 <div class='observable-wrapper div-number-1'>
</div>
<div>


<div class='block'>
  <div class='observable-wrapper div-number-2'>
  </div>
  <div class='observable-wrapper div-number-3'>
  </div>
 </div>

 <div class='block'>
  <div class='observable-wrapper div-number-5'>
  </div>
  <div class='observable-wrapper div-number-6'>
  </div>
 </div>

 
 <div class='block'>


  <div class='observable-wrapper div-number-8'>
  </div>
  <div class='observable-wrapper div-number-9'>
  </div>
 </div>


</div>

<style>
.rewind-wrapper {
  padding:20px;
}
.rewind-wrapper textarea{
    width: 100%;
    margin-top:10px;
    margin-bottom:10px;
    height: 127px;
}
   

</style>

<div class="full-page-blog-width" style="clear:both">
 

</div>



<div style='display:none' data-type='module' class='script-this'>
    
 console.log('start')
  import notebook from "https://api.observablehq.com/@bumbeishvili/apply-color-palette-to-html.js";

console.log('imported')

const html = document.querySelector('.full-page-blog-width').innerHTML;
document.querySelector('.full-page-blog-width').innerHTML=(html+notebook.modules[0].variables
.filter(d=>d)
.map((d,i)=>{
  if(i<7 || i>10) return '';
  return ` <d`+`iv class="observable-wrapper div-number-${i}" 
               ${i>=21 || [7,10].includes(i)?"style='display:none'":''}></`+`div>`
})
.join(''));

console.log('created')


  import {Inspector, Runtime} from "https://unpkg.com/@observablehq/runtime@3/dist/runtime.js";
 
 

   let i=1;
   Runtime.load(notebook, (variable) => {
       const selector = `.observable-wrapper.div-number-${i++}`
       if(document.querySelector(selector)){
          return new Inspector(document.querySelector(selector));
       }

   });

console.log('finished');


   
</div>
 

<script>

     s = document.createElement('script');
    s.type = 'module';
    var code = document.querySelector('.script-this').innerText;
    try {
      s.appendChild(document.createTextNode(code));
      document.body.appendChild(s);
    } catch (e) {
      s.text = code;
      document.body.appendChild(s);
}

 </script>