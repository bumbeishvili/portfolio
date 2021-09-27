---
layout: tool
comments: true
title: Svg drop shadow playground
subtitle: 'd3.js'
date: 2019-9-22 00:00:00
description:  .
featured_image: '/images/tools/dropShadowPlayground.png'
---
<style>



 input[type=range] {
  box-sizing: border-box;
  font-size: 16px;
  line-height: 1;
  height: 2em;
  background-color: transparent;
  cursor: pointer;
  -webkit-appearance: slider-horizontal;
  width: 70%;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
}
input[type=range]:focus {
  outline: none;
}
input[type=range]::-ms-track {
  width: 100%;
  cursor: pointer;
  background: transparent;
  border-color: transparent;
  color: transparent;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 2em;
  height: 2em;
  margin-top: 0;
  background-color: #16a085;
  border-radius: 1em;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
input[type=range]::-moz-range-thumb {
  width: 2em;
  height: 2em;
  margin-top: 0;
  background-color: #16a085;
  border-radius: 1em;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
input[type=range]::-ms-thumb {
  width: 2em;
  height: 2em;
  margin-top: 0;
  background-color: #16a085;
  border-radius: 1em;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
input[type=range]:hover::-webkit-slider-thumb {
  border-color: rgba(255, 255, 255, 0.7);
}
input[type=range]:hover::-moz-range-thumb {
  border-color: rgba(255, 255, 255, 0.7);
}
input[type=range]:hover::-ms-thumb {
  border-color: rgba(255, 255, 255, 0.7);
}
input[type=range]:active::-webkit-slider-thumb {
  border-color: #ffffff;
}
input[type=range]:active::-moz-range-thumb {
  border-color: #ffffff;
}
input[type=range]:active::-ms-thumb {
  border-color: #ffffff;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  cursor: pointer;
  height: 1em;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  background-color: transparent;
}
input[type=range]::-moz-range-track {
  width: 100%;
  cursor: pointer;
  height: 1em;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  background-color: transparent;
}
input[type=range]::-ms-track {
  background: transparent;
  border-color: transparent;
  color: transparent;
}

</style> 
<div class='page-observable-wrapper'>


<div id="fb-root"></div>
 <div class='observable-wrapper div-number-1'>
</div>
<div>


<div class='block'>
  <div class='observable-wrapper div-number-2'>
  </div>
    <div class='observable-wrapper div-number-4'>
  </div>
 </div>



 


</div>

<style>
.page-observable-wrapper {
  padding:20px;
}


   

</style>

<div class="full-page-blog-width" style="clear:both">
 

</div>



<div style='display:none' data-type='module' class='script-this'>
    
 console.log('start')
  import notebook from "https://api.observablehq.com/@bumbeishvili/svg-drop-shadows.js";

console.log('imported')

const html = document.querySelector('.full-page-blog-width').innerHTML;
document.querySelector('.full-page-blog-width').innerHTML=(html+notebook.modules[0].variables
.filter(d=>d)
.map((d,i)=>{

  if(i<0 || i>20) return '';
  return ` <d`+`iv " class="observable-wrapper div-number-${i}" 
               ${i>=21 || [3,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].indexOf(i)!=-1?"style='display:none'":''}></`+`div>`
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