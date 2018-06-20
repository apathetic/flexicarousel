// import { isTouch, transform } from './features';
import { easeInCubic } from './features';

export default class Carousel {

  /**
   * Construct a new Carousel
   * @param {HTMLElement} handle The Carousel container element.
   * @param {Object} options The options object.
   */
  constructor(handle, options={}) {

    this.handle = handle;

    // state vars
    this.current = 0;
    this.slides = [];
    this.isSliding = false;
    this.isActive = true;

    // touch vars
    this.isDragging = false;
    this.dragThreshold = 50;
    this.deltaX = 0;

    // set up options
    this.options = this._assign(Carousel.defaults, options);

    // engage engines
    this.init();
  }

  /**
   * Initialize the carousel and set some defaults
   * @param  {object} options List of key: value options
   * @return {void}
   */
  init() {
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
      'touchstart': (e) => { this._dragStart(e); },
      'touchmove': (e) => { this._drag(e); },
      'touchend': (e) => { this._dragEnd(e); },
      'touchcancel': (e) => { this._dragEnd(e); },
      'mousedown': (e) => { this._dragStart(e); },
      'mousemove': (e) => { this._drag(e); },
      'mouseup': (e) => { this._dragEnd(e); },
      'mouseleave': (e) => { this._dragEnd(e); },
      'click': (e) => { this._checkDragThreshold(e); },
 
      // window
      'resize': (e) => { this._updateView(e); },
      'orientationchange': (e) => { this._updateView(e); }
    };
 

    if ('ontouchend' in document) {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].map((event) => {
        this.handle.addEventListener(event, this._bindings[event]);
      });
    } else {
      ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'click'].map((event) => {
        this.handle.addEventListener(event, this._bindings[event]);
      });
    }
    
    window.addEventListener('resize', this._bindings['resize']);
    window.addEventListener('orientationchange', this._bindings['orientationchange']);
    
    this._getDimensions();
    this.go(this.current, false);
    return this;
  }

  /**
   * Removes all event bindings.
   * @returns {Carousel}
   */
  destroy() {
    if (!this.isActive) { return; }

    for (let event in this._bindings) {
      this.handle.removeEventListener(event, this._bindings[event]);
    }

    window.removeEventListener('resize', this._bindings['resize']);
    window.removeEventListener('orientationchange', this._bindings['orientationchange']);

    this._bindings = null;
    this.options = this.slides = this.slideWrap = this.handle = null;
    this.isActive = false;

    // remove classes ...
    // remove clones ...
  }

  /**
   * Go to the next slide.
   * @return {void}
   */
  next() {
    if (this.options.infinite || this.current !== this.numSlides-1) {
      this.go(this.current + 1);
    } else {
      this.go(this.numSlides-1);
    }
  }

  /**
   * Go to the previous slide
   * @return {void}
   */
  prev() {
    if (this.options.infinite || this.current !== 0) {
      this.go(this.current - 1);
    } else {
      this.go(0);    // allow the slide to "snap" back if dragging and not infinite
    }
  }

  /**
   * Go to a particular slide.
   * @param  {int} to The slide to go to
   */
  go(to) {
    const opts = this.options;

    if (this.isSliding || !this.isActive) { return; }

    // if (to < 0 || to >= this.numSlides) {                             // position the carousel if infinite and at end of bounds
    //   let temp = (to < 0) ? this.current + this.numSlides : this.current - this.numSlides;
    //   this._slide( -(temp * this.width - this.deltaX) );
    //   this.slideWrap.offsetHeight;                                    // force a repaint to actually position "to" slide. *Important*
    // }

    to = this._loop(to);
    this._slide(-(to * this.width));

    if (opts.onSlide && to !== this.current) { 
      opts.onSlide.call(this, to, this.current);  // note: doesn't check if it's a function
    }

    // this._removeClass(this.slides[this.current], opts.activeClass);
    // this._addClass(this.slides[to], opts.activeClass);
    this.slides[this.current].classList.remove(opts.activeClass);
    this.slides[to].classList.add(opts.activeClass);
    this.current = to;
  }


  // ------------------------------------- Drag Events ------------------------------------- //


  /**
   * Check if user has sufficiently dragged to advance to a new slide.
   * @param {Event} e The touch event.
   * @private
   */
  _checkDragThreshold(e) {
    if (this.dragThresholdMet) {
      e.preventDefault();
    }
  }

  /**
   * Start dragging (via touch)
   * @param {Event} e The touch event.
   * @private
   */
  _dragStart(e) {
    var touches;

    if (this.isSliding) {
      return false;
    }

    e = e.originalEvent || e;
    touches = e.touches !== undefined ? e.touches : false;

    this.dragThresholdMet = false;
    this.isDragging = true;
    this.startClientX = touches ? touches[0].pageX : e.clientX;
    this.startClientY = touches ? touches[0].pageY : e.clientY;
    this.deltaX = 0;  // reset for the case when user does 0,0 touch
    this.deltaY = 0;  // reset for the case when user does 0,0 touch

    if (e.target.tagName === 'IMG' || e.target.tagName === 'A') { e.target.draggable = false; }
  }

  /**
   * Update slides positions according to user's touch
   * @param {Event} e The touch event.
   * @private
   */
  _drag(e) {
    var touches;

    if (!this.isDragging) {
      return;
    }

    e = e.originalEvent || e;
    touches = e.touches !== undefined ? e.touches : false;
    this.deltaX = (touches ? touches[0].pageX : e.clientX) - this.startClientX;
    this.deltaY = (touches ? touches[0].pageY : e.clientY) - this.startClientY;

    // drag slide along with cursor
    // this._slide( -(this.current * this.width - this.deltaX ) );
    this.offset = this.current * this.width - this.deltaX;
    this.slideWrap.style.transform = 'translate3d(' + this.offset + 'px, 0, 0)';

    // determine if we should do slide, or cancel and let the event pass through to the page
    this.dragThresholdMet = Math.abs(this.deltaX) > this.dragThreshold;
  }

  /**
   * Drag end, calculate slides' new positions
   * @param {Event} e The touch event.
   * @private
   */
  _dragEnd(e) {
    if (!this.isDragging) {
      return;
    }

    if (this.dragThresholdMet) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    this.isDragging = false;

    if ( this.deltaX !== 0 && Math.abs(this.deltaX) < this.dragThreshold ) {
      this.go(this.current);
    }
    else if ( this.deltaX > 0 ) {
      // var jump = Math.round(this.deltaX / this.width);  // distance-based check to swipe multiple slides
      // this.go(this.current - jump);
      this.prev();
    }
    else if ( this.deltaX < 0 ) {
      this.next();
    }

    this.deltaX = 0;
  }


  // ------------------------------------- carousel engine ------------------------------------- //


  /**
   * Animates the translation of the slide wrapper.
   * @param  {number} end Where to translate the slide to. 
   * @private
   */
  _slide(end) {
    const duration = 400;
    const start = this.offset;

    this.slideWrap.classList.add(opts.animateClass);

    // if (this.isSliding) {
      // this._addClass(this.slideWrap, this.options.animateClass);

      const scroll = (timestamp) => {
        startTime = startTime || timestamp;
        const elapsed = timestamp - startTime;
        const offset = easeInCubic(elapsed, start, end, duration);
        this.slideWrap.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
        // // use 3D tranforms for hardware acceleration on iOS
        // // but use 2D when settled, for better font-rendering
        // this.slider.style.transform = this.isAnimating ?
        // 'translate3d(' + offset + ',0,0)' : 'translateX(' + offset + ')';

        if (elapsed < duration) {
          window.requestAnimationFrame(scroll);
        } else {
          this._removeClass(this.slideWrap, this.options.animateClass);
          this.isSliding = false;
        }
      };
  
      window.requestAnimationFrame(scroll);
    // }
  }


  // ------------------------------------- "helper" functions ------------------------------------- //


  /**
   * Helper function. Calculate modulo of a slides position
   * @param  {int} val Slide's position
   * @return {int} the index modulo the # of slides
   * @private
   */
  _loop(val) {
    return (this.numSlides + (val % this.numSlides)) % this.numSlides;
  }

  /**
   * Set the Carousel's width and determine the slide offset.
   * @private
   */
  _getDimensions() {
    this.width = this.slides[0].getBoundingClientRect().width;
    // this.offset = this.cloned * this.width;
  }

  /**
   * Update the slides' position on a resize. This is throttled at 300ms
   * @private
   */
  _updateView() {
    // Check if the resize was horizontal. On touch devices, changing scroll
    // direction will cause the browser tab bar to appear, which triggers a resize
    if (window.innerWidth !== this._viewport) {
      this._viewport = window.innerWidth;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this._getDimensions();
        this.go(this.current);
      }, 300);
    }
  }


  /**
   * Helper function to add a class to an element
   * @param  {int} i       Index of the slide to add a class to
   * @param  {string} name Class name
   * @return {void}
   * /
  _addClass(el, name) {
    if (el.classList) { el.classList.add(name); }
    else {el.className += ' ' + name; }
  }

  /**
   * Helper function to remove a class from an element
   * @param  {int} i       Index of the slide to remove class from
   * @param  {string} name Class name
   * @return {void}
   * /
  _removeClass(el, name) {
    if (el.classList) { el.classList.remove(name); }
    else { el.className = el.className.replace(new RegExp('(^|\\b)' + name.split(' ').join('|') + '(\\b|$)', 'gi'), ' '); }
  }

  /**
   * Shallow Object.assign polyfill
   * @param {object} dest The object to copy into
   * @param {object} src  The object to copy from
   */
  _assign(dest, src) {
    Object.keys(src).forEach((key) => {
      dest[key] = src[key];
    });

    return dest;
  }
};

// default options
Carousel.defaults = {
  animateClass: 'animate',
  activeClass: 'active',
  slideWrap: 'ul',
  slides: 'li',           // the slides
  infinite: true,         // set to true to be able to navigate from last to first slide, and vice versa
  display: 1,             // the minimum # of slides to display at a time. If you want to have slides
                          // "hanging" off outside the currently viewable ones, they'd be included here
  // disableDragging: false, // set to true if you'd like to disable touch events, temporarily or otherwise
  //  use: .disable(bool) {}
  initialIndex: 0         // slide index where the carousel should start
};