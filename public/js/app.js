
/*
   This file is a junk drawer of our custom js. It's loaded after vendored
   javascript but before any template-specific js.
 */

function __(el) {
  if (!(this instanceof __)) {
    return new __(el);
  }
  this.el = document.querySelector(el);
}

__.prototype.get = function() {
  return this.el;
}

__.prototype.fade = function fade(type, ms) {
  var isIn = type === 'in',
    opacity = isIn ? 0 : 1,
    interval = 50,
    duration = ms,
    gap = interval / duration,
    self = this;

  if(isIn) {
    self.el.style.display = 'block';
    self.el.style.opacity = opacity;
  }

  function func() {
    opacity = isIn ? opacity + gap : opacity - gap;
    self.el.style.opacity = opacity;

    if(opacity <= 0) self.el.style.display = 'none'
    if(opacity <= 0 || opacity >= 1) window.clearInterval(fading);
  }

  var fading = window.setInterval(func, interval);
}