/**
 * Feature detection: CSS transforms
 * @type {Boolean}
 */

let trans = '';

['transform', 'webkitTransform', 'MozTransform', 'OTransform', 'msTransform'].forEach((t) => {
  if (document.body.style[t] !== undefined) { trans = t; }
});


export const isTouch = 'ontouchend' in document;
export const transform = trans;