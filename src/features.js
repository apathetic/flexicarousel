/**
 * Feature detection: CSS transforms
 * @type {Boolean}
 */

// const dummy = document.createElement('div');
// export const transform = ['transform', 'webkitTransform', 'MozTransform', 'OTransform', 'msTransform'].find((t) => {
//   // return (document.body.style[t] !== undefined);   // if DOM is not yet ready, let's do:
//   return (dummy.style[t] !== undefined);
// });


let trans = '';
['transform', 'webkitTransform', 'MozTransform', 'OTransform', 'msTransform'].forEach((t) => {
  if (document.body.style[t] !== undefined) { trans = t; }
});


export const isTouch = 'ontouchend' in document;
export const transform = trans;