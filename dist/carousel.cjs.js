/*!
MIT License

Copyright (c) 2013, 2017 wes hatch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use strict';

function easeInCubic(t, b, c, d) {
  return c * (t /= d) * t * t + b;
}

// import { isTouch, transform } from './features';
var Carousel = function Carousel(handle, options) {
  if ( options === void 0 ) options={};


  this.handle = handle;

  // state vars
  this.current = 0;
  this.slides = [];
  this.cloned = 0;
  this.isSliding = false;
  this.isActive = true;

  // touch vars
  this.isDragging = false;
  this.dragThreshold = 50;
  this.deltaX = 0;

  // set up options
  // this.options = this._assign(Carousel.defaults, options);
  this.options = Object.assign({}, Carousel.defaults, options);

  // engage engines
  this.init();
};

/**
 * Initialize the carousel and set some defaults
 * @param{object} options List of key: value options
 * @return {void}
 */
Carousel.prototype.init = function init () {
    var this$1 = this;

  this.slideWrap = this.handle.querySelector(this.options.slideWrap);
  this.slides = this.slideWrap.querySelectorAll(this.options.slides);
  this.numSlides = this.slides.length;
  this.current = this.options.initialIndex;

  if (!this.slideWrap || !this.slides || this.numSlides < this.options.display) { 
    console.warn('Carousel: insufficient # slides');
    return this.isActive = false;
  }
  // if (this.options.infinite) { this._cloneSlides(); }
    // if (!this.options.disableDragging) {

  this._bindings = {
    // handle
    'touchstart': function (e) { this$1._dragStart(e); },
    'touchmove': function (e) { this$1._drag(e); },
    'touchend': function (e) { this$1._dragEnd(e); },
    'touchcancel': function (e) { this$1._dragEnd(e); },
    'mousedown': function (e) { this$1._dragStart(e); },
    'mousemove': function (e) { this$1._drag(e); },
    'mouseup': function (e) { this$1._dragEnd(e); },
    'mouseleave': function (e) { this$1._dragEnd(e); },
    'click': function (e) { this$1._checkDragThreshold(e); },
 
    // window
    'resize': function (e) { this$1._updateView(e); },
    'orientationchange': function (e) { this$1._updateView(e); }
  };
 
  if ('ontouchend' in document) {
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].map(function (event) {
      this$1.handle.addEventListener(event, this$1._bindings[event]);
    });
  } else {
    ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'click'].map(function (event) {
      this$1.handle.addEventListener(event, this$1._bindings[event]);
    });
  }
    
  window.addEventListener('resize', this._bindings['resize']);
  window.addEventListener('orientationchange', this._bindings['orientationchange']);
    
  this._getDimensions();
  this.go(this.current, false);

  return this;
};

/**
 * Removes all event bindings.
 * @returns {Carousel}
 */
Carousel.prototype.destroy = function destroy () {
    var this$1 = this;

  for (var event in this$1._bindings) {
    this$1.handle.removeEventListener(event, this$1._bindings[event]);
  }

  window.removeEventListener('resize', this._bindings['resize']);
  window.removeEventListener('orientationchange', this._bindings['orientationchange']);

  this.options = this.slides = this.slideWrap = this.handle = null;
  this.isActive = false;

  clearTimeout(this.timer);

  // remove classes ...
  // remove clones ...
};

/**
 * Go to the next slide.
 * @return {void}
 */
Carousel.prototype.next = function next () {
  if (this.options.infinite || this.current !== this.numSlides-1) {
    this.go(this.current + 1);
  } else {
    this.go(this.numSlides - 1);
  }
};

/**
 * Go to the previous slide
 * @return {void}
 */
Carousel.prototype.prev = function prev () {
  var to = (this.options.infinite || this.current !== 0) ? this.current - 1 : 0;

  this.go(to);
};

/**
 * Go to a particular slide.
 * @param {int} to The slide to go to
 */
Carousel.prototype.go = function go (to) {
  var opts = this.options;

  if (this.isSliding || !this.isActive) { return; }

  // if (to < 0 || to >= this.numSlides) {                           // position the carousel if infinite and at end of bounds
  // let temp = (to < 0) ? this.current + this.numSlides : this.current - this.numSlides;
  // let offset = -(temp * this.width - this.deltaX);
  // this.slideWrap.style.transform = 'translate3d(' + offset + 'px, 0, 0)'; // translateX for better text rendering...?
  // this.slideWrap.offsetHeight;                                  // force a repaint to actually position "to" slide. *Important*
  // }

  to = this._loop(to);
  this._slide(-(to * this.width));

  if (to !== this.current) { 
    opts.onSlide && opts.onSlide.call(this, to, this.current);
  }

  this.slides[this.current].classList.remove(opts.activeClass);
  this.slides[to].classList.add(opts.activeClass);
  this.current = to;
};


// ------------------------------------- Drag Events ------------------------------------- //


/**
 * Check if user has sufficiently dragged to advance to a new slide.
 * @param {Event} e The touch event.
 * @private
 */
Carousel.prototype._checkDragThreshold = function _checkDragThreshold (e) {
  if (this.dragThresholdMet) {
    e.preventDefault();
  }
};

/**
 * Normalizes a touch or drag event into X, Y coordinate values.
 * @param {Event} e The touch or drag event
 * @return {Object} An object with X, Y coordinates
 */
Carousel.prototype._normalizeEvent = function _normalizeEvent (e) {
  e = e.originalEvent || e;
  var touches = e.touches !== undefined ? e.touches : false;

  return {
    X: touches ? touches[0].pageX : e.clientX,
    Y: touches ? touches[0].pageY : e.clientY
  };
};

/**
 * Start dragging (via touch)
 * @param {Event} e The touch event.
 * @private
 */
Carousel.prototype._dragStart = function _dragStart (e) {
  if (this.isSliding) {
    // return false;
    this.isSliding = false;
    this.slideWrap.classList.remove(this.options.animateClass);
    clearTimeout(this.timer);
  }

  var drag = this._normalizeEvent(e);

  this.startClientX = drag.X;
  // this.startClientY = drag.Y;
  this.dragThresholdMet = false;
  this.isDragging = true;
  this.deltaX = 0;
  // this.deltaY = 0;

  if (e.target.tagName === 'IMG' || e.target.tagName === 'A') { e.target.draggable = false; }
};

/**
 * Update slides positions according to user's touch
 * @param {Event} e The touch event.
 * @private
 */
Carousel.prototype._drag = function _drag (e) {
  if (!this.isDragging) {                                                 // if triggered via mouseMove event
    return;
  }

  var drag = this._normalizeEvent(e);

  this.deltaX = drag.X - this.startClientX;
  // this.deltaY = drag.Y - this.startClientY;
  var position = -(this.current * this.width - this.deltaX) - this.offset;// drag slide along with cursor

  this.slideWrap.style.transform = 'translate3d(' + position + 'px, 0, 0)'; // translateX for better text rendering...?
  this.dragThresholdMet = Math.abs(this.deltaX) > this.dragThreshold;     // determines if we should do slide, or cancel

  // this.drags is array of (4?)   new Array(4)
  // this.drags.push(this.deltaX) // keep track of 4(?) last drag positions,
  // this.drags.shift();          // so that we may determine velocity
};

/**
 * Drag end, calculate slides' new positions
 * @param {Event} e The touch event.
 * @private
 */
Carousel.prototype._dragEnd = function _dragEnd (e) {
  if (!this.isDragging) {                                                 // if triggered via mouseLeave event
    return;
  }

  if (this.dragThresholdMet) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  this.isDragging = false;

  if (this.deltaX !== 0 && Math.abs(this.deltaX) < this.dragThreshold) {
    this.go(this.current);
  }
  else if (this.deltaX > 0) {
    // var jump = Math.round(this.deltaX / this.width);// distance-based check to swipe multiple slides
    // this.drags[3] - this.drags[0] > some thresh...?
    // this.go(this.current - jump);
    this.prev();
  }
  else if (this.deltaX < 0) {
    this.next();
  }

  // this.deltaX = 0;
};


// ------------------------------------- carousel engine ------------------------------------- //


/**
 * Animates the translation of the slide wrapper.
 * @param{number} end Where to translate the slide to. 
 * @private
 */
Carousel.prototype.___slide = function ___slide (end) {
    var this$1 = this;

  var duration = 400;
  var start = this.offset;
  var startTime;

  this.slideWrap.classList.add(this.options.animateClass);

  // if (this.isSliding) {

    var scroll = function (timestamp) {
      startTime = startTime || timestamp;
      var elapsed = timestamp - startTime;
      var offset = easeInCubic(elapsed, start, end, duration);

      console.log(offset);
      this$1.slideWrap.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
      // // use 3D tranforms for hardware acceleration on iOS
      // // but use 2D when settled, for better font-rendering
      // this.slider.style.transform = this.isAnimating ?
      // 'translate3d(' + offset + ',0,0)' : 'translateX(' + offset + ')';

      if (elapsed < duration) {
        window.requestAnimationFrame(scroll);
      } else {
        this$1.slideWrap.classList.remove(this$1.options.animateClass);
        this$1.isSliding = false;
      }
    };
  
    window.requestAnimationFrame(scroll);
  // }
};

/**
 * Applies the slide translation in browser.
 * @param{number} offset The offset, in pixels, to shift the slide wrapper.
 * @private
 */
Carousel.prototype._slide = function _slide (offset) {
    var this$1 = this;

  offset -= this.offset;

  this.isSliding = true;
  this.slideWrap.classList.add(this.options.animateClass);
  this.slideWrap.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
  this.timer = setTimeout(function () {
    this$1.isSliding = false;
    this$1.slideWrap.classList.remove(this$1.options.animateClass);
  }, this.options.speed);

};


// ------------------------------------- "helper" functions ------------------------------------- //


/**
 * Helper function. Calculate modulo of a slides position
 * @param{int} val Slide's position
 * @return {int} the index modulo the # of slides
 * @private
 */
Carousel.prototype._loop = function _loop (val) {
  return (this.numSlides + (val % this.numSlides)) % this.numSlides;
};

/**
 * Set the Carousel's width and determine the slide offset.
 * @private
 */
Carousel.prototype._getDimensions = function _getDimensions () {
  this.width = this.slides[0].getBoundingClientRect().width;
  this.offset = this.cloned * this.width;
};

/**
 * Update the slides' position on a resize. This is throttled at 150ms
 * @private
 */
Carousel.prototype._updateView = function _updateView () {
    var this$1 = this;

  // Check if the resize was horizontal. On touch devices, changing scroll
  // direction will cause the browser tab bar to appear, which triggers a resize
  if (window.innerWidth !== this._viewport) {
    this._viewport = window.innerWidth;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      this$1._getDimensions();
      this$1.go(this$1.current);
    }, 150);
  }
};


/**
 * Duplicate the first and last N slides so that infinite scrolling can work.
 * Depends on how many slides are visible at a time, and any outlying slides as well
 * @return {void}
 */
Carousel.prototype._cloneSlides = function _cloneSlides () {
    var this$1 = this;

  var duplicate;
  var display = this.options.display;
  var fromEnd = Math.max(this.numSlides - display, 0);
  var fromBeg = Math.min(display, this.numSlides);

  // take "display" slides from the end and add to the beginning
  for (var i = this.numSlides; i > fromEnd; i--) {
    duplicate = this$1.slides[i-1].cloneNode(true);                     // cloneNode --> true is deep cloning
    duplicate.removeAttribute('id');
    duplicate.setAttribute('aria-hidden', 'true');
    // this._addClass(duplicate, 'clone');
    duplicate.classList.add('clone');
    this$1.slideWrap.insertBefore(duplicate, this$1.slideWrap.firstChild);// "prependChild"
    this$1.cloned++;
  }

  // take "display" slides from the beginning and add to the end
  for (var i$1 = 0; i$1 < fromBeg; i$1++) {
    duplicate = this$1.slides[i$1].cloneNode(true);
    duplicate.removeAttribute('id');
    duplicate.setAttribute('aria-hidden', 'true');
    // this._addClass(duplicate, 'clone');
    duplicate.classList.add('clone');
    this$1.slideWrap.appendChild(duplicate);
  }
};



/**
 * Shallow Object.assign polyfill
 * @param {Object} dest The object to copy into
 * @param {Object} srcThe object to copy from
 * @return {Object} The Object with merged properties
 */
Carousel.prototype._assign = function _assign (dest, src) {
  Object.keys(src).forEach(function (key) {
    dest[key] = src[key];
  });

  return dest;
};



// default options
Carousel.defaults = {
  animateClass: 'animate',
  activeClass: 'active',
  slideWrap: 'ul',
  slides: 'li',           // the slides
  infinite: false,        // set to true to be able to navigate from last to first slide, and vice versa
  display: 1,             // the minimum # of slides to display at a time. If you want to have slides
                          // "hanging" off outside the currently viewable ones, they'd be included here
  // disableDragging: false, // set to true if you'd like to disable touch events, temporarily or otherwise
  //  use: .disable(bool) {}
  speed: 400,             // transition speed of Carousel, in ms
  initialIndex: 0         // slide index where the carousel should start
};

module.exports = Carousel;
