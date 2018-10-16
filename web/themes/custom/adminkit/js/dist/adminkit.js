/**
 * SVGInjector v1.1.3 - Fast, caching, dynamic inline SVG DOM injection library
 * https://github.com/iconic/SVGInjector
 *
 * Copyright (c) 2014-2015 Waybury <hello@waybury.com>
 * @license MIT
 */

(function (window, document) {

  'use strict';

  // Environment

  var isLocal = window.location.protocol === 'file:';
  var hasSvgSupport = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');

  function uniqueClasses(list) {
    list = list.split(' ');

    var hash = {};
    var i = list.length;
    var out = [];

    while (i--) {
      if (!hash.hasOwnProperty(list[i])) {
        hash[list[i]] = 1;
        out.unshift(list[i]);
      }
    }

    return out.join(' ');
  }

  /**
   * cache (or polyfill for <= IE8) Array.forEach()
   * source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
   */
  var forEach = Array.prototype.forEach || function (fn, scope) {
    if (this === void 0 || this === null || typeof fn !== 'function') {
      throw new TypeError();
    }

    /* jshint bitwise: false */
    var i,
        len = this.length >>> 0;
    /* jshint bitwise: true */

    for (i = 0; i < len; ++i) {
      if (i in this) {
        fn.call(scope, this[i], i, this);
      }
    }
  };

  // SVG Cache
  var svgCache = {};

  var injectCount = 0;
  var injectedElements = [];

  // Request Queue
  var requestQueue = [];

  // Script running status
  var ranScripts = {};

  var cloneSvg = function (sourceSvg) {
    return sourceSvg.cloneNode(true);
  };

  var queueRequest = function (url, callback) {
    requestQueue[url] = requestQueue[url] || [];
    requestQueue[url].push(callback);
  };

  var processRequestQueue = function (url) {
    for (var i = 0, len = requestQueue[url].length; i < len; i++) {
      // Make these calls async so we avoid blocking the page/renderer
      /* jshint loopfunc: true */
      (function (index) {
        setTimeout(function () {
          requestQueue[url][index](cloneSvg(svgCache[url]));
        }, 0);
      })(i);
      /* jshint loopfunc: false */
    }
  };

  var loadSvg = function (url, callback) {
    if (svgCache[url] !== undefined) {
      if (svgCache[url] instanceof SVGSVGElement) {
        // We already have it in cache, so use it
        callback(cloneSvg(svgCache[url]));
      } else {
        // We don't have it in cache yet, but we are loading it, so queue this request
        queueRequest(url, callback);
      }
    } else {

      if (!window.XMLHttpRequest) {
        callback('Browser does not support XMLHttpRequest');
        return false;
      }

      // Seed the cache to indicate we are loading this URL already
      svgCache[url] = {};
      queueRequest(url, callback);

      var httpRequest = new XMLHttpRequest();

      httpRequest.onreadystatechange = function () {
        // readyState 4 = complete
        if (httpRequest.readyState === 4) {

          // Handle status
          if (httpRequest.status === 404 || httpRequest.responseXML === null) {
            callback('Unable to load SVG file: ' + url);

            if (isLocal) callback('Note: SVG injection ajax calls do not work locally without adjusting security setting in your browser. Or consider using a local webserver.');

            callback();
            return false;
          }

          // 200 success from server, or 0 when using file:// protocol locally
          if (httpRequest.status === 200 || isLocal && httpRequest.status === 0) {

            /* globals Document */
            if (httpRequest.responseXML instanceof Document) {
              // Cache it
              svgCache[url] = httpRequest.responseXML.documentElement;
            }
            /* globals -Document */

            // IE9 doesn't create a responseXML Document object from loaded SVG,
            // and throws a "DOM Exception: HIERARCHY_REQUEST_ERR (3)" error when injected.
            //
            // So, we'll just create our own manually via the DOMParser using
            // the the raw XML responseText.
            //
            // :NOTE: IE8 and older doesn't have DOMParser, but they can't do SVG either, so...
            else if (DOMParser && DOMParser instanceof Function) {
                var xmlDoc;
                try {
                  var parser = new DOMParser();
                  xmlDoc = parser.parseFromString(httpRequest.responseText, 'text/xml');
                } catch (e) {
                  xmlDoc = undefined;
                }

                if (!xmlDoc || xmlDoc.getElementsByTagName('parsererror').length) {
                  callback('Unable to parse SVG file: ' + url);
                  return false;
                } else {
                  // Cache it
                  svgCache[url] = xmlDoc.documentElement;
                }
              }

            // We've loaded a new asset, so process any requests waiting for it
            processRequestQueue(url);
          } else {
            callback('There was a problem injecting the SVG: ' + httpRequest.status + ' ' + httpRequest.statusText);
            return false;
          }
        }
      };

      httpRequest.open('GET', url);

      // Treat and parse the response as XML, even if the
      // server sends us a different mimetype
      if (httpRequest.overrideMimeType) httpRequest.overrideMimeType('text/xml');

      httpRequest.send();
    }
  };

  // Inject a single element
  var injectElement = function (el, evalScripts, pngFallback, callback) {

    // Grab the src or data-src attribute
    var imgUrl = el.getAttribute('data-src') || el.getAttribute('src');

    // We can only inject SVG
    if (!/\.svg/i.test(imgUrl)) {
      callback('Attempted to inject a file with a non-svg extension: ' + imgUrl);
      return;
    }

    // If we don't have SVG support try to fall back to a png,
    // either defined per-element via data-fallback or data-png,
    // or globally via the pngFallback directory setting
    if (!hasSvgSupport) {
      var perElementFallback = el.getAttribute('data-fallback') || el.getAttribute('data-png');

      // Per-element specific PNG fallback defined, so use that
      if (perElementFallback) {
        el.setAttribute('src', perElementFallback);
        callback(null);
      }
      // Global PNG fallback directoriy defined, use the same-named PNG
      else if (pngFallback) {
          el.setAttribute('src', pngFallback + '/' + imgUrl.split('/').pop().replace('.svg', '.png'));
          callback(null);
        }
        // um...
        else {
            callback('This browser does not support SVG and no PNG fallback was defined.');
          }

      return;
    }

    // Make sure we aren't already in the process of injecting this element to
    // avoid a race condition if multiple injections for the same element are run.
    // :NOTE: Using indexOf() only _after_ we check for SVG support and bail,
    // so no need for IE8 indexOf() polyfill
    if (injectedElements.indexOf(el) !== -1) {
      return;
    }

    // Remember the request to inject this element, in case other injection
    // calls are also trying to replace this element before we finish
    injectedElements.push(el);

    // Try to avoid loading the orginal image src if possible.
    el.setAttribute('src', '');

    // Load it up
    loadSvg(imgUrl, function (svg) {

      if (typeof svg === 'undefined' || typeof svg === 'string') {
        callback(svg);
        return false;
      }

      var imgId = el.getAttribute('id');
      if (imgId) {
        svg.setAttribute('id', imgId);
      }

      var imgTitle = el.getAttribute('title');
      if (imgTitle) {
        svg.setAttribute('title', imgTitle);
      }

      // Concat the SVG classes + 'injected-svg' + the img classes
      var classMerge = [].concat(svg.getAttribute('class') || [], 'injected-svg', el.getAttribute('class') || []).join(' ');
      svg.setAttribute('class', uniqueClasses(classMerge));

      var imgStyle = el.getAttribute('style');
      if (imgStyle) {
        svg.setAttribute('style', imgStyle);
      }

      // Copy all the data elements to the svg
      var imgData = [].filter.call(el.attributes, function (at) {
        return (/^data-\w[\w\-]*$/.test(at.name)
        );
      });
      forEach.call(imgData, function (dataAttr) {
        if (dataAttr.name && dataAttr.value) {
          svg.setAttribute(dataAttr.name, dataAttr.value);
        }
      });

      // Make sure any internally referenced clipPath ids and their
      // clip-path references are unique.
      //
      // This addresses the issue of having multiple instances of the
      // same SVG on a page and only the first clipPath id is referenced.
      //
      // Browsers often shortcut the SVG Spec and don't use clipPaths
      // contained in parent elements that are hidden, so if you hide the first
      // SVG instance on the page, then all other instances lose their clipping.
      // Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=376027

      // Handle all defs elements that have iri capable attributes as defined by w3c: http://www.w3.org/TR/SVG/linking.html#processingIRI
      // Mapping IRI addressable elements to the properties that can reference them:
      var iriElementsAndProperties = {
        'clipPath': ['clip-path'],
        'color-profile': ['color-profile'],
        'cursor': ['cursor'],
        'filter': ['filter'],
        'linearGradient': ['fill', 'stroke'],
        'marker': ['marker', 'marker-start', 'marker-mid', 'marker-end'],
        'mask': ['mask'],
        'pattern': ['fill', 'stroke'],
        'radialGradient': ['fill', 'stroke']
      };

      var element, elementDefs, properties, currentId, newId;
      Object.keys(iriElementsAndProperties).forEach(function (key) {
        element = key;
        properties = iriElementsAndProperties[key];

        elementDefs = svg.querySelectorAll('defs ' + element + '[id]');
        for (var i = 0, elementsLen = elementDefs.length; i < elementsLen; i++) {
          currentId = elementDefs[i].id;
          newId = currentId + '-' + injectCount;

          // All of the properties that can reference this element type
          var referencingElements;
          forEach.call(properties, function (property) {
            // :NOTE: using a substring match attr selector here to deal with IE "adding extra quotes in url() attrs"
            referencingElements = svg.querySelectorAll('[' + property + '*="' + currentId + '"]');
            for (var j = 0, referencingElementLen = referencingElements.length; j < referencingElementLen; j++) {
              referencingElements[j].setAttribute(property, 'url(#' + newId + ')');
            }
          });

          elementDefs[i].id = newId;
        }
      });

      // Remove any unwanted/invalid namespaces that might have been added by SVG editing tools
      svg.removeAttribute('xmlns:a');

      // Post page load injected SVGs don't automatically have their script
      // elements run, so we'll need to make that happen, if requested

      // Find then prune the scripts
      var scripts = svg.querySelectorAll('script');
      var scriptsToEval = [];
      var script, scriptType;

      for (var k = 0, scriptsLen = scripts.length; k < scriptsLen; k++) {
        scriptType = scripts[k].getAttribute('type');

        // Only process javascript types.
        // SVG defaults to 'application/ecmascript' for unset types
        if (!scriptType || scriptType === 'application/ecmascript' || scriptType === 'application/javascript') {

          // innerText for IE, textContent for other browsers
          script = scripts[k].innerText || scripts[k].textContent;

          // Stash
          scriptsToEval.push(script);

          // Tidy up and remove the script element since we don't need it anymore
          svg.removeChild(scripts[k]);
        }
      }

      // Run/Eval the scripts if needed
      if (scriptsToEval.length > 0 && (evalScripts === 'always' || evalScripts === 'once' && !ranScripts[imgUrl])) {
        for (var l = 0, scriptsToEvalLen = scriptsToEval.length; l < scriptsToEvalLen; l++) {

          // :NOTE: Yup, this is a form of eval, but it is being used to eval code
          // the caller has explictely asked to be loaded, and the code is in a caller
          // defined SVG file... not raw user input.
          //
          // Also, the code is evaluated in a closure and not in the global scope.
          // If you need to put something in global scope, use 'window'
          new Function(scriptsToEval[l])(window); // jshint ignore:line
        }

        // Remember we already ran scripts for this svg
        ranScripts[imgUrl] = true;
      }

      // :WORKAROUND:
      // IE doesn't evaluate <style> tags in SVGs that are dynamically added to the page.
      // This trick will trigger IE to read and use any existing SVG <style> tags.
      //
      // Reference: https://github.com/iconic/SVGInjector/issues/23
      var styleTags = svg.querySelectorAll('style');
      forEach.call(styleTags, function (styleTag) {
        styleTag.textContent += '';
      });

      // Replace the image with the svg
      el.parentNode.replaceChild(svg, el);

      // Now that we no longer need it, drop references
      // to the original element so it can be GC'd
      delete injectedElements[injectedElements.indexOf(el)];
      el = null;

      // Increment the injected count
      injectCount++;

      callback(svg);
    });
  };

  /**
   * SVGInjector
   *
   * Replace the given elements with their full inline SVG DOM elements.
   *
   * :NOTE: We are using get/setAttribute with SVG because the SVG DOM spec differs from HTML DOM and
   * can return other unexpected object types when trying to directly access svg properties.
   * ex: "className" returns a SVGAnimatedString with the class value found in the "baseVal" property,
   * instead of simple string like with HTML Elements.
   *
   * @param {mixes} Array of or single DOM element
   * @param {object} options
   * @param {function} callback
   * @return {object} Instance of SVGInjector
   */
  var SVGInjector = function (elements, options, done) {

    // Options & defaults
    options = options || {};

    // Should we run the scripts blocks found in the SVG
    // 'always' - Run them every time
    // 'once' - Only run scripts once for each SVG
    // [false|'never'] - Ignore scripts
    var evalScripts = options.evalScripts || 'always';

    // Location of fallback pngs, if desired
    var pngFallback = options.pngFallback || false;

    // Callback to run during each SVG injection, returning the SVG injected
    var eachCallback = options.each;

    // Do the injection...
    if (elements.length !== undefined) {
      var elementsLoaded = 0;
      forEach.call(elements, function (element) {
        injectElement(element, evalScripts, pngFallback, function (svg) {
          if (eachCallback && typeof eachCallback === 'function') eachCallback(svg);
          if (done && elements.length === ++elementsLoaded) done(elementsLoaded);
        });
      });
    } else {
      if (elements) {
        injectElement(elements, evalScripts, pngFallback, function (svg) {
          if (eachCallback && typeof eachCallback === 'function') eachCallback(svg);
          if (done) done(1);
          elements = null;
        });
      } else {
        if (done) done(0);
      }
    }
  };

  /* global module, exports: true, define */
  // Node.js or CommonJS
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = exports = SVGInjector;
  }
  // AMD support
  else if (typeof define === 'function' && define.amd) {
      define(function () {
        return SVGInjector;
      });
    }
    // Otherwise, attach to window as global
    else if (typeof window === 'object') {
        window.SVGInjector = SVGInjector;
      }
  /* global -module, -exports, -define */
})(window, document);
var autoScroll = function () {
    'use strict';

    function getDef(f, d) {
        if (typeof f === 'undefined') {
            return typeof d === 'undefined' ? f : d;
        }

        return f;
    }
    function boolean(func, def) {

        func = getDef(func, def);

        if (typeof func === 'function') {
            return function f() {
                var arguments$1 = arguments;

                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments$1[_key];
                }

                return !!func.apply(this, args);
            };
        }

        return !!func ? function () {
            return true;
        } : function () {
            return false;
        };
    }

    var prefix = ['webkit', 'moz', 'ms', 'o'];

    var requestAnimationFrame = function () {

        for (var i = 0, limit = prefix.length; i < limit && !window.requestAnimationFrame; ++i) {
            window.requestAnimationFrame = window[prefix[i] + 'RequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            (function () {
                var lastTime = 0;

                window.requestAnimationFrame = function (callback) {
                    var now = new Date().getTime();
                    var ttc = Math.max(0, 16 - now - lastTime);
                    var timer = window.setTimeout(function () {
                        return callback(now + ttc);
                    }, ttc);

                    lastTime = now + ttc;

                    return timer;
                };
            })();
        }

        return window.requestAnimationFrame.bind(window);
    }();

    var cancelAnimationFrame = function () {

        for (var i = 0, limit = prefix.length; i < limit && !window.cancelAnimationFrame; ++i) {
            window.cancelAnimationFrame = window[prefix[i] + 'CancelAnimationFrame'] || window[prefix[i] + 'CancelRequestAnimationFrame'];
        }

        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (timer) {
                window.clearTimeout(timer);
            };
        }

        return window.cancelAnimationFrame.bind(window);
    }();

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    /**
     * Returns `true` if provided input is Element.
     * @name isElement
     * @param {*} [input]
     * @returns {boolean}
     */
    var isElement = function (input) {
        return input != null && (typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object' && input.nodeType === 1 && _typeof(input.style) === 'object' && _typeof(input.ownerDocument) === 'object';
    };

    // Production steps of ECMA-262, Edition 6, 22.1.2.1
    // Reference: http://www.ecma-international.org/ecma-262/6.0/#sec-array.from

    /**
     * isArray
     */

    function indexOfElement(elements, element) {
        element = resolveElement(element, true);
        if (!isElement(element)) {
            return -1;
        }
        for (var i = 0; i < elements.length; i++) {
            if (elements[i] === element) {
                return i;
            }
        }
        return -1;
    }

    function hasElement(elements, element) {
        return -1 !== indexOfElement(elements, element);
    }

    function pushElements(elements, toAdd) {

        for (var i = 0; i < toAdd.length; i++) {
            if (!hasElement(elements, toAdd[i])) {
                elements.push(toAdd[i]);
            }
        }

        return toAdd;
    }

    function addElements(elements) {
        var arguments$1 = arguments;

        for (var _len2 = arguments.length, toAdd = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            toAdd[_key2 - 1] = arguments$1[_key2];
        }

        toAdd = toAdd.map(resolveElement);
        return pushElements(elements, toAdd);
    }

    function removeElements(elements) {
        var arguments$1 = arguments;

        for (var _len3 = arguments.length, toRemove = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
            toRemove[_key3 - 1] = arguments$1[_key3];
        }

        return toRemove.map(resolveElement).reduce(function (last, e) {

            var index$$1 = indexOfElement(elements, e);

            if (index$$1 !== -1) {
                return last.concat(elements.splice(index$$1, 1));
            }
            return last;
        }, []);
    }

    function resolveElement(element, noThrow) {
        if (typeof element === 'string') {
            try {
                return document.querySelector(element);
            } catch (e) {
                throw e;
            }
        }

        if (!isElement(element) && !noThrow) {
            throw new TypeError(element + ' is not a DOM element.');
        }
        return element;
    }

    var index$2 = function createPointCB(object, options) {

        // A persistent object (as opposed to returned object) is used to save memory
        // This is good to prevent layout thrashing, or for games, and such

        // NOTE
        // This uses IE fixes which should be OK to remove some day. :)
        // Some speed will be gained by removal of these.

        // pointCB should be saved in a variable on return
        // This allows the usage of element.removeEventListener

        options = options || {};

        var allowUpdate;

        if (typeof options.allowUpdate === 'function') {
            allowUpdate = options.allowUpdate;
        } else {
            allowUpdate = function () {
                return true;
            };
        }

        return function pointCB(event) {

            event = event || window.event; // IE-ism
            object.target = event.target || event.srcElement || event.originalTarget;
            object.element = this;
            object.type = event.type;

            if (!allowUpdate(event)) {
                return;
            }

            // Support touch
            // http://www.creativebloq.com/javascript/make-your-site-work-touch-devices-51411644

            if (event.targetTouches) {
                object.x = event.targetTouches[0].clientX;
                object.y = event.targetTouches[0].clientY;
                object.pageX = event.pageX;
                object.pageY = event.pageY;
            } else {

                // If pageX/Y aren't available and clientX/Y are,
                // calculate pageX/Y - logic taken from jQuery.
                // (This is to support old IE)
                // NOTE Hopefully this can be removed soon.

                if (event.pageX === null && event.clientX !== null) {
                    var eventDoc = event.target && event.target.ownerDocument || document;
                    var doc = eventDoc.documentElement;
                    var body = eventDoc.body;

                    object.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
                    object.pageY = event.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
                } else {
                    object.pageX = event.pageX;
                    object.pageY = event.pageY;
                }

                // pageX, and pageY change with page scroll
                // so we're not going to use those for x, and y.
                // NOTE Most browsers also alias clientX/Y with x/y
                // so that's something to consider down the road.

                object.x = event.clientX;
                object.y = event.clientY;
            }
        };

        //NOTE Remember accessibility, Aria roles, and labels.
    };

    function createWindowRect() {
        var props = {
            top: { value: 0, enumerable: true },
            left: { value: 0, enumerable: true },
            right: { value: window.innerWidth, enumerable: true },
            bottom: { value: window.innerHeight, enumerable: true },
            width: { value: window.innerWidth, enumerable: true },
            height: { value: window.innerHeight, enumerable: true },
            x: { value: 0, enumerable: true },
            y: { value: 0, enumerable: true }
        };

        if (Object.create) {
            return Object.create({}, props);
        } else {
            var rect = {};
            Object.defineProperties(rect, props);
            return rect;
        }
    }

    function getClientRect(el) {
        if (el === window) {
            return createWindowRect();
        } else {
            try {
                var rect = el.getBoundingClientRect();
                if (rect.x === undefined) {
                    rect.x = rect.left;
                    rect.y = rect.top;
                }
                return rect;
            } catch (e) {
                throw new TypeError("Can't call getBoundingClientRect on " + el);
            }
        }
    }

    function pointInside(point, el) {
        var rect = getClientRect(el);
        return point.y > rect.top && point.y < rect.bottom && point.x > rect.left && point.x < rect.right;
    }

    var objectCreate = void 0;
    if (typeof Object.create != 'function') {
        objectCreate = function (undefined) {
            var Temp = function Temp() {};
            return function (prototype, propertiesObject) {
                if (prototype !== Object(prototype) && prototype !== null) {
                    throw TypeError('Argument must be an object, or null');
                }
                Temp.prototype = prototype || {};
                var result = new Temp();
                Temp.prototype = null;
                if (propertiesObject !== undefined) {
                    Object.defineProperties(result, propertiesObject);
                }

                // to imitate the case of Object.create(null)
                if (prototype === null) {
                    result.__proto__ = null;
                }
                return result;
            };
        }();
    } else {
        objectCreate = Object.create;
    }

    var objectCreate$1 = objectCreate;

    var mouseEventProps = ['altKey', 'button', 'buttons', 'clientX', 'clientY', 'ctrlKey', 'metaKey', 'movementX', 'movementY', 'offsetX', 'offsetY', 'pageX', 'pageY', 'region', 'relatedTarget', 'screenX', 'screenY', 'shiftKey', 'which', 'x', 'y'];

    function createDispatcher(element) {

        var defaultSettings = {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            button: 0,
            buttons: 1,
            relatedTarget: null,
            region: null
        };

        if (element !== undefined) {
            element.addEventListener('mousemove', onMove);
        }

        function onMove(e) {
            for (var i = 0; i < mouseEventProps.length; i++) {
                defaultSettings[mouseEventProps[i]] = e[mouseEventProps[i]];
            }
        }

        var dispatch = function () {
            if (MouseEvent) {
                return function m1(element, initMove, data) {
                    var evt = new MouseEvent('mousemove', createMoveInit(defaultSettings, initMove));

                    //evt.dispatched = 'mousemove';
                    setSpecial(evt, data);

                    return element.dispatchEvent(evt);
                };
            } else if (typeof document.createEvent === 'function') {
                return function m2(element, initMove, data) {
                    var settings = createMoveInit(defaultSettings, initMove);
                    var evt = document.createEvent('MouseEvents');

                    evt.initMouseEvent("mousemove", true, //can bubble
                    true, //cancelable
                    window, //view
                    0, //detail
                    settings.screenX, //0, //screenX
                    settings.screenY, //0, //screenY
                    settings.clientX, //80, //clientX
                    settings.clientY, //20, //clientY
                    settings.ctrlKey, //false, //ctrlKey
                    settings.altKey, //false, //altKey
                    settings.shiftKey, //false, //shiftKey
                    settings.metaKey, //false, //metaKey
                    settings.button, //0, //button
                    settings.relatedTarget //null //relatedTarget
                    );

                    //evt.dispatched = 'mousemove';
                    setSpecial(evt, data);

                    return element.dispatchEvent(evt);
                };
            } else if (typeof document.createEventObject === 'function') {
                return function m3(element, initMove, data) {
                    var evt = document.createEventObject();
                    var settings = createMoveInit(defaultSettings, initMove);
                    for (var name in settings) {
                        evt[name] = settings[name];
                    }

                    //evt.dispatched = 'mousemove';
                    setSpecial(evt, data);

                    return element.dispatchEvent(evt);
                };
            }
        }();

        function destroy() {
            if (element) {
                element.removeEventListener('mousemove', onMove, false);
            }
            defaultSettings = null;
        }

        return {
            destroy: destroy,
            dispatch: dispatch
        };
    }

    function createMoveInit(defaultSettings, initMove) {
        initMove = initMove || {};
        var settings = objectCreate$1(defaultSettings);
        for (var i = 0; i < mouseEventProps.length; i++) {
            if (initMove[mouseEventProps[i]] !== undefined) {
                settings[mouseEventProps[i]] = initMove[mouseEventProps[i]];
            }
        }

        return settings;
    }

    function setSpecial(e, data) {
        console.log('data ', data);
        e.data = data || {};
        e.dispatched = 'mousemove';
    }

    function AutoScroller(elements, options) {
        if (options === void 0) options = {};

        var self = this;
        var maxSpeed = 4,
            scrolling = false;

        this.margin = options.margin || -1;
        //this.scrolling = false;
        this.scrollWhenOutside = options.scrollWhenOutside || false;

        var point = {},
            pointCB = index$2(point),
            dispatcher = createDispatcher(),
            down = false;

        window.addEventListener('mousemove', pointCB, false);
        window.addEventListener('touchmove', pointCB, false);

        if (!isNaN(options.maxSpeed)) {
            maxSpeed = options.maxSpeed;
        }

        this.autoScroll = boolean(options.autoScroll);
        this.syncMove = boolean(options.syncMove, false);

        this.destroy = function () {
            window.removeEventListener('mousemove', pointCB, false);
            window.removeEventListener('touchmove', pointCB, false);
            window.removeEventListener('mousedown', onDown, false);
            window.removeEventListener('touchstart', onDown, false);
            window.removeEventListener('mouseup', onUp, false);
            window.removeEventListener('touchend', onUp, false);

            window.removeEventListener('mousemove', onMove, false);
            window.removeEventListener('touchmove', onMove, false);

            window.removeEventListener('scroll', setScroll, true);
            elements = [];
        };

        this.add = function () {
            var element = [],
                len = arguments.length;
            while (len--) element[len] = arguments[len];

            addElements.apply(void 0, [elements].concat(element));
            return this;
        };

        this.remove = function () {
            var element = [],
                len = arguments.length;
            while (len--) element[len] = arguments[len];

            return removeElements.apply(void 0, [elements].concat(element));
        };

        var hasWindow = null,
            windowAnimationFrame;

        if (Object.prototype.toString.call(elements) !== '[object Array]') {
            elements = [elements];
        }

        (function (temp) {
            elements = [];
            temp.forEach(function (element) {
                if (element === window) {
                    hasWindow = window;
                } else {
                    self.add(element);
                }
            });
        })(elements);

        Object.defineProperties(this, {
            down: {
                get: function () {
                    return down;
                }
            },
            maxSpeed: {
                get: function () {
                    return maxSpeed;
                }
            },
            point: {
                get: function () {
                    return point;
                }
            },
            scrolling: {
                get: function () {
                    return scrolling;
                }
            }
        });

        var n = 0,
            current = null,
            animationFrame;

        window.addEventListener('mousedown', onDown, false);
        window.addEventListener('touchstart', onDown, false);
        window.addEventListener('mouseup', onUp, false);
        window.addEventListener('touchend', onUp, false);

        window.addEventListener('mousemove', onMove, false);
        window.addEventListener('touchmove', onMove, false);

        window.addEventListener('mouseleave', onMouseOut, false);

        window.addEventListener('scroll', setScroll, true);

        function setScroll(e) {

            for (var i = 0; i < elements.length; i++) {
                if (elements[i] === e.target) {
                    scrolling = true;
                    break;
                }
            }

            if (scrolling) {
                requestAnimationFrame(function () {
                    return scrolling = false;
                });
            }
        }

        function onDown() {
            down = true;
        }

        function onUp() {
            down = false;
            cancelAnimationFrame(animationFrame);
            cancelAnimationFrame(windowAnimationFrame);
        }

        function onMouseOut() {
            down = false;
        }

        function getTarget(target) {
            if (!target) {
                return null;
            }

            if (current === target) {
                return target;
            }

            if (hasElement(elements, target)) {
                return target;
            }

            while (target = target.parentNode) {
                if (hasElement(elements, target)) {
                    return target;
                }
            }

            return null;
        }

        function getElementUnderPoint() {
            var underPoint = null;

            for (var i = 0; i < elements.length; i++) {
                if (inside(point, elements[i])) {
                    underPoint = elements[i];
                }
            }

            return underPoint;
        }

        function onMove(event) {

            if (!self.autoScroll()) {
                return;
            }

            if (event['dispatched']) {
                return;
            }

            var target = event.target,
                body = document.body;

            if (current && !inside(point, current)) {
                if (!self.scrollWhenOutside) {
                    current = null;
                }
            }

            if (target && target.parentNode === body) {
                //The special condition to improve speed.
                target = getElementUnderPoint();
            } else {
                target = getTarget(target);

                if (!target) {
                    target = getElementUnderPoint();
                }
            }

            if (target && target !== current) {
                current = target;
            }

            if (hasWindow) {
                cancelAnimationFrame(windowAnimationFrame);
                windowAnimationFrame = requestAnimationFrame(scrollWindow);
            }

            if (!current) {
                return;
            }

            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(scrollTick);
        }

        function scrollWindow() {
            autoScroll(hasWindow);

            cancelAnimationFrame(windowAnimationFrame);
            windowAnimationFrame = requestAnimationFrame(scrollWindow);
        }

        function scrollTick() {

            if (!current) {
                return;
            }

            autoScroll(current);

            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(scrollTick);
        }

        function autoScroll(el) {
            var rect = getClientRect(el),
                scrollx,
                scrolly;

            if (point.x < rect.left + self.margin) {
                scrollx = Math.floor(Math.max(-1, (point.x - rect.left) / self.margin - 1) * self.maxSpeed);
            } else if (point.x > rect.right - self.margin) {
                scrollx = Math.ceil(Math.min(1, (point.x - rect.right) / self.margin + 1) * self.maxSpeed);
            } else {
                scrollx = 0;
            }

            if (point.y < rect.top + self.margin) {
                scrolly = Math.floor(Math.max(-1, (point.y - rect.top) / self.margin - 1) * self.maxSpeed);
            } else if (point.y > rect.bottom - self.margin) {
                scrolly = Math.ceil(Math.min(1, (point.y - rect.bottom) / self.margin + 1) * self.maxSpeed);
            } else {
                scrolly = 0;
            }

            if (self.syncMove()) {
                /*
                Notes about mousemove event dispatch.
                screen(X/Y) should need to be updated.
                Some other properties might need to be set.
                Keep the syncMove option default false until all inconsistencies are taken care of.
                */
                dispatcher.dispatch(el, {
                    pageX: point.pageX + scrollx,
                    pageY: point.pageY + scrolly,
                    clientX: point.x + scrollx,
                    clientY: point.y + scrolly
                });
            }

            setTimeout(function () {

                if (scrolly) {
                    scrollY(el, scrolly);
                }

                if (scrollx) {
                    scrollX(el, scrollx);
                }
            });
        }

        function scrollY(el, amount) {
            if (el === window) {
                window.scrollTo(el.pageXOffset, el.pageYOffset + amount);
            } else {
                el.scrollTop += amount;
            }
        }

        function scrollX(el, amount) {
            if (el === window) {
                window.scrollTo(el.pageXOffset + amount, el.pageYOffset);
            } else {
                el.scrollLeft += amount;
            }
        }
    }

    function AutoScrollerFactory(element, options) {
        return new AutoScroller(element, options);
    }

    function inside(point, el, rect) {
        if (!rect) {
            return pointInside(point, el);
        } else {
            return point.y > rect.top && point.y < rect.bottom && point.x > rect.left && point.x < rect.right;
        }
    }

    /*
    git remote add origin https://github.com/hollowdoor/dom_autoscroller.git
    git push -u origin master
    */

    return AutoScrollerFactory;
}();
//# sourceMappingURL=dom-autoscroller.js.map
(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }g.dragula = f();
  }
})(function () {
  var define, module, exports;return function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
        }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
          var n = t[o][1][e];return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
  }({ 1: [function (require, module, exports) {
      'use strict';

      var cache = {};
      var start = '(?:^|\\s)';
      var end = '(?:\\s|$)';

      function lookupClass(className) {
        var cached = cache[className];
        if (cached) {
          cached.lastIndex = 0;
        } else {
          cache[className] = cached = new RegExp(start + className + end, 'g');
        }
        return cached;
      }

      function addClass(el, className) {
        var current = el.className;
        if (!current.length) {
          el.className = className;
        } else if (!lookupClass(className).test(current)) {
          el.className += ' ' + className;
        }
      }

      function rmClass(el, className) {
        el.className = el.className.replace(lookupClass(className), ' ').trim();
      }

      module.exports = {
        add: addClass,
        rm: rmClass
      };
    }, {}], 2: [function (require, module, exports) {
      (function (global) {
        'use strict';

        var emitter = require('contra/emitter');
        var crossvent = require('crossvent');
        var classes = require('./classes');
        var doc = document;
        var documentElement = doc.documentElement;

        function dragula(initialContainers, options) {
          var len = arguments.length;
          if (len === 1 && Array.isArray(initialContainers) === false) {
            options = initialContainers;
            initialContainers = [];
          }
          var _mirror; // mirror image
          var _source; // source container
          var _item; // item being dragged
          var _offsetX; // reference x
          var _offsetY; // reference y
          var _moveX; // reference move x
          var _moveY; // reference move y
          var _initialSibling; // reference sibling when grabbed
          var _currentSibling; // reference sibling now
          var _copy; // item used for copying
          var _renderTimer; // timer for setTimeout renderMirrorImage
          var _lastDropTarget = null; // last container item was over
          var _grabbed; // holds mousedown context until first mousemove

          var o = options || {};
          if (o.moves === void 0) {
            o.moves = always;
          }
          if (o.accepts === void 0) {
            o.accepts = always;
          }
          if (o.invalid === void 0) {
            o.invalid = invalidTarget;
          }
          if (o.containers === void 0) {
            o.containers = initialContainers || [];
          }
          if (o.isContainer === void 0) {
            o.isContainer = never;
          }
          if (o.copy === void 0) {
            o.copy = false;
          }
          if (o.copySortSource === void 0) {
            o.copySortSource = false;
          }
          if (o.revertOnSpill === void 0) {
            o.revertOnSpill = false;
          }
          if (o.removeOnSpill === void 0) {
            o.removeOnSpill = false;
          }
          if (o.direction === void 0) {
            o.direction = 'vertical';
          }
          if (o.ignoreInputTextSelection === void 0) {
            o.ignoreInputTextSelection = true;
          }
          if (o.mirrorContainer === void 0) {
            o.mirrorContainer = doc.body;
          }

          var drake = emitter({
            containers: o.containers,
            start: manualStart,
            end: end,
            cancel: cancel,
            remove: remove,
            destroy: destroy,
            canMove: canMove,
            dragging: false
          });

          if (o.removeOnSpill === true) {
            drake.on('over', spillOver).on('out', spillOut);
          }

          events();

          return drake;

          function isContainer(el) {
            return drake.containers.indexOf(el) !== -1 || o.isContainer(el);
          }

          function events(remove) {
            var op = remove ? 'remove' : 'add';
            touchy(documentElement, op, 'mousedown', grab);
            touchy(documentElement, op, 'mouseup', release);
          }

          function eventualMovements(remove) {
            var op = remove ? 'remove' : 'add';
            touchy(documentElement, op, 'mousemove', startBecauseMouseMoved);
          }

          function movements(remove) {
            var op = remove ? 'remove' : 'add';
            crossvent[op](documentElement, 'selectstart', preventGrabbed); // IE8
            crossvent[op](documentElement, 'click', preventGrabbed);
          }

          function destroy() {
            events(true);
            release({});
          }

          function preventGrabbed(e) {
            if (_grabbed) {
              e.preventDefault();
            }
          }

          function grab(e) {
            _moveX = e.clientX;
            _moveY = e.clientY;

            var ignore = whichMouseButton(e) !== 1 || e.metaKey || e.ctrlKey;
            if (ignore) {
              return; // we only care about honest-to-god left clicks and touch events
            }
            var item = e.target;
            var context = canStart(item);
            if (!context) {
              return;
            }
            _grabbed = context;
            eventualMovements();
            if (e.type === 'mousedown') {
              if (isInput(item)) {
                // see also: https://github.com/bevacqua/dragula/issues/208
                item.focus(); // fixes https://github.com/bevacqua/dragula/issues/176
              } else {
                e.preventDefault(); // fixes https://github.com/bevacqua/dragula/issues/155
              }
            }
          }

          function startBecauseMouseMoved(e) {
            if (!_grabbed) {
              return;
            }
            if (whichMouseButton(e) === 0) {
              release({});
              return; // when text is selected on an input and then dragged, mouseup doesn't fire. this is our only hope
            }
            // truthy check fixes #239, equality fixes #207
            if (e.clientX !== void 0 && e.clientX === _moveX && e.clientY !== void 0 && e.clientY === _moveY) {
              return;
            }
            if (o.ignoreInputTextSelection) {
              var clientX = getCoord('clientX', e);
              var clientY = getCoord('clientY', e);
              var elementBehindCursor = doc.elementFromPoint(clientX, clientY);
              if (isInput(elementBehindCursor)) {
                return;
              }
            }

            var grabbed = _grabbed; // call to end() unsets _grabbed
            eventualMovements(true);
            movements();
            end();
            start(grabbed);

            var offset = getOffset(_item);
            _offsetX = getCoord('pageX', e) - offset.left;
            _offsetY = getCoord('pageY', e) - offset.top;

            classes.add(_copy || _item, 'gu-transit');
            renderMirrorImage();
            drag(e);
          }

          function canStart(item) {
            if (drake.dragging && _mirror) {
              return;
            }
            if (isContainer(item)) {
              return; // don't drag container itself
            }
            var handle = item;
            while (getParent(item) && isContainer(getParent(item)) === false) {
              if (o.invalid(item, handle)) {
                return;
              }
              item = getParent(item); // drag target should be a top element
              if (!item) {
                return;
              }
            }
            var source = getParent(item);
            if (!source) {
              return;
            }
            if (o.invalid(item, handle)) {
              return;
            }

            var movable = o.moves(item, source, handle, nextEl(item));
            if (!movable) {
              return;
            }

            return {
              item: item,
              source: source
            };
          }

          function canMove(item) {
            return !!canStart(item);
          }

          function manualStart(item) {
            var context = canStart(item);
            if (context) {
              start(context);
            }
          }

          function start(context) {
            if (isCopy(context.item, context.source)) {
              _copy = context.item.cloneNode(true);
              drake.emit('cloned', _copy, context.item, 'copy');
            }

            _source = context.source;
            _item = context.item;
            _initialSibling = _currentSibling = nextEl(context.item);

            drake.dragging = true;
            drake.emit('drag', _item, _source);
          }

          function invalidTarget() {
            return false;
          }

          function end() {
            if (!drake.dragging) {
              return;
            }
            var item = _copy || _item;
            drop(item, getParent(item));
          }

          function ungrab() {
            _grabbed = false;
            eventualMovements(true);
            movements(true);
          }

          function release(e) {
            ungrab();

            if (!drake.dragging) {
              return;
            }
            var item = _copy || _item;
            var clientX = getCoord('clientX', e);
            var clientY = getCoord('clientY', e);
            var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
            var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
            if (dropTarget && (_copy && o.copySortSource || !_copy || dropTarget !== _source)) {
              drop(item, dropTarget);
            } else if (o.removeOnSpill) {
              remove();
            } else {
              cancel();
            }
          }

          function drop(item, target) {
            var parent = getParent(item);
            if (_copy && o.copySortSource && target === _source) {
              parent.removeChild(_item);
            }
            if (isInitialPlacement(target)) {
              drake.emit('cancel', item, _source, _source);
            } else {
              drake.emit('drop', item, target, _source, _currentSibling);
            }
            cleanup();
          }

          function remove() {
            if (!drake.dragging) {
              return;
            }
            var item = _copy || _item;
            var parent = getParent(item);
            if (parent) {
              parent.removeChild(item);
            }
            drake.emit(_copy ? 'cancel' : 'remove', item, parent, _source);
            cleanup();
          }

          function cancel(revert) {
            if (!drake.dragging) {
              return;
            }
            var reverts = arguments.length > 0 ? revert : o.revertOnSpill;
            var item = _copy || _item;
            var parent = getParent(item);
            var initial = isInitialPlacement(parent);
            if (initial === false && reverts) {
              if (_copy) {
                if (parent) {
                  parent.removeChild(_copy);
                }
              } else {
                _source.insertBefore(item, _initialSibling);
              }
            }
            if (initial || reverts) {
              drake.emit('cancel', item, _source, _source);
            } else {
              drake.emit('drop', item, parent, _source, _currentSibling);
            }
            cleanup();
          }

          function cleanup() {
            var item = _copy || _item;
            ungrab();
            removeMirrorImage();
            if (item) {
              classes.rm(item, 'gu-transit');
            }
            if (_renderTimer) {
              clearTimeout(_renderTimer);
            }
            drake.dragging = false;
            if (_lastDropTarget) {
              drake.emit('out', item, _lastDropTarget, _source);
            }
            drake.emit('dragend', item);
            _source = _item = _copy = _initialSibling = _currentSibling = _renderTimer = _lastDropTarget = null;
          }

          function isInitialPlacement(target, s) {
            var sibling;
            if (s !== void 0) {
              sibling = s;
            } else if (_mirror) {
              sibling = _currentSibling;
            } else {
              sibling = nextEl(_copy || _item);
            }
            return target === _source && sibling === _initialSibling;
          }

          function findDropTarget(elementBehindCursor, clientX, clientY) {
            var target = elementBehindCursor;
            while (target && !accepted()) {
              target = getParent(target);
            }
            return target;

            function accepted() {
              var droppable = isContainer(target);
              if (droppable === false) {
                return false;
              }

              var immediate = getImmediateChild(target, elementBehindCursor);
              var reference = getReference(target, immediate, clientX, clientY);
              var initial = isInitialPlacement(target, reference);
              if (initial) {
                return true; // should always be able to drop it right back where it was
              }
              return o.accepts(_item, target, _source, reference);
            }
          }

          function drag(e) {
            if (!_mirror) {
              return;
            }
            e.preventDefault();

            var clientX = getCoord('clientX', e);
            var clientY = getCoord('clientY', e);
            var x = clientX - _offsetX;
            var y = clientY - _offsetY;

            _mirror.style.left = x + 'px';
            _mirror.style.top = y + 'px';

            var item = _copy || _item;
            var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
            var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
            var changed = dropTarget !== null && dropTarget !== _lastDropTarget;
            if (changed || dropTarget === null) {
              out();
              _lastDropTarget = dropTarget;
              over();
            }
            var parent = getParent(item);
            if (dropTarget === _source && _copy && !o.copySortSource) {
              if (parent) {
                parent.removeChild(item);
              }
              return;
            }
            var reference;
            var immediate = getImmediateChild(dropTarget, elementBehindCursor);
            if (immediate !== null) {
              reference = getReference(dropTarget, immediate, clientX, clientY);
            } else if (o.revertOnSpill === true && !_copy) {
              reference = _initialSibling;
              dropTarget = _source;
            } else {
              if (_copy && parent) {
                parent.removeChild(item);
              }
              return;
            }
            if (reference === null && changed || reference !== item && reference !== nextEl(item)) {
              _currentSibling = reference;
              dropTarget.insertBefore(item, reference);
              drake.emit('shadow', item, dropTarget, _source);
            }
            function moved(type) {
              drake.emit(type, item, _lastDropTarget, _source);
            }
            function over() {
              if (changed) {
                moved('over');
              }
            }
            function out() {
              if (_lastDropTarget) {
                moved('out');
              }
            }
          }

          function spillOver(el) {
            classes.rm(el, 'gu-hide');
          }

          function spillOut(el) {
            if (drake.dragging) {
              classes.add(el, 'gu-hide');
            }
          }

          function renderMirrorImage() {
            if (_mirror) {
              return;
            }
            var rect = _item.getBoundingClientRect();
            _mirror = _item.cloneNode(true);
            _mirror.style.width = getRectWidth(rect) + 'px';
            _mirror.style.height = getRectHeight(rect) + 'px';
            classes.rm(_mirror, 'gu-transit');
            classes.add(_mirror, 'gu-mirror');
            o.mirrorContainer.appendChild(_mirror);
            touchy(documentElement, 'add', 'mousemove', drag);
            classes.add(o.mirrorContainer, 'gu-unselectable');
            drake.emit('cloned', _mirror, _item, 'mirror');
          }

          function removeMirrorImage() {
            if (_mirror) {
              classes.rm(o.mirrorContainer, 'gu-unselectable');
              touchy(documentElement, 'remove', 'mousemove', drag);
              getParent(_mirror).removeChild(_mirror);
              _mirror = null;
            }
          }

          function getImmediateChild(dropTarget, target) {
            var immediate = target;
            while (immediate !== dropTarget && getParent(immediate) !== dropTarget) {
              immediate = getParent(immediate);
            }
            if (immediate === documentElement) {
              return null;
            }
            return immediate;
          }

          function getReference(dropTarget, target, x, y) {
            var horizontal = o.direction === 'horizontal';
            var reference = target !== dropTarget ? inside() : outside();
            return reference;

            function outside() {
              // slower, but able to figure out any position
              var len = dropTarget.children.length;
              var i;
              var el;
              var rect;
              for (i = 0; i < len; i++) {
                el = dropTarget.children[i];
                rect = el.getBoundingClientRect();
                if (horizontal && rect.left + rect.width / 2 > x) {
                  return el;
                }
                if (!horizontal && rect.top + rect.height / 2 > y) {
                  return el;
                }
              }
              return null;
            }

            function inside() {
              // faster, but only available if dropped inside a child element
              var rect = target.getBoundingClientRect();
              if (horizontal) {
                return resolve(x > rect.left + getRectWidth(rect) / 2);
              }
              return resolve(y > rect.top + getRectHeight(rect) / 2);
            }

            function resolve(after) {
              return after ? nextEl(target) : target;
            }
          }

          function isCopy(item, container) {
            return typeof o.copy === 'boolean' ? o.copy : o.copy(item, container);
          }
        }

        function touchy(el, op, type, fn) {
          var touch = {
            mouseup: 'touchend',
            mousedown: 'touchstart',
            mousemove: 'touchmove'
          };
          var pointers = {
            mouseup: 'pointerup',
            mousedown: 'pointerdown',
            mousemove: 'pointermove'
          };
          var microsoft = {
            mouseup: 'MSPointerUp',
            mousedown: 'MSPointerDown',
            mousemove: 'MSPointerMove'
          };
          if (global.navigator.pointerEnabled) {
            crossvent[op](el, pointers[type], fn);
          } else if (global.navigator.msPointerEnabled) {
            crossvent[op](el, microsoft[type], fn);
          } else {
            crossvent[op](el, touch[type], fn);
            crossvent[op](el, type, fn);
          }
        }

        function whichMouseButton(e) {
          if (e.touches !== void 0) {
            return e.touches.length;
          }
          if (e.which !== void 0 && e.which !== 0) {
            return e.which;
          } // see https://github.com/bevacqua/dragula/issues/261
          if (e.buttons !== void 0) {
            return e.buttons;
          }
          var button = e.button;
          if (button !== void 0) {
            // see https://github.com/jquery/jquery/blob/99e8ff1baa7ae341e94bb89c3e84570c7c3ad9ea/src/event.js#L573-L575
            return button & 1 ? 1 : button & 2 ? 3 : button & 4 ? 2 : 0;
          }
        }

        function getOffset(el) {
          var rect = el.getBoundingClientRect();
          return {
            left: rect.left + getScroll('scrollLeft', 'pageXOffset'),
            top: rect.top + getScroll('scrollTop', 'pageYOffset')
          };
        }

        function getScroll(scrollProp, offsetProp) {
          if (typeof global[offsetProp] !== 'undefined') {
            return global[offsetProp];
          }
          if (documentElement.clientHeight) {
            return documentElement[scrollProp];
          }
          return doc.body[scrollProp];
        }

        function getElementBehindPoint(point, x, y) {
          var p = point || {};
          var state = p.className;
          var el;
          p.className += ' gu-hide';
          el = doc.elementFromPoint(x, y);
          p.className = state;
          return el;
        }

        function never() {
          return false;
        }
        function always() {
          return true;
        }
        function getRectWidth(rect) {
          return rect.width || rect.right - rect.left;
        }
        function getRectHeight(rect) {
          return rect.height || rect.bottom - rect.top;
        }
        function getParent(el) {
          return el.parentNode === doc ? null : el.parentNode;
        }
        function isInput(el) {
          return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || isEditable(el);
        }
        function isEditable(el) {
          if (!el) {
            return false;
          } // no parents were editable
          if (el.contentEditable === 'false') {
            return false;
          } // stop the lookup
          if (el.contentEditable === 'true') {
            return true;
          } // found a contentEditable element in the chain
          return isEditable(getParent(el)); // contentEditable is set to 'inherit'
        }

        function nextEl(el) {
          return el.nextElementSibling || manually();
          function manually() {
            var sibling = el;
            do {
              sibling = sibling.nextSibling;
            } while (sibling && sibling.nodeType !== 1);
            return sibling;
          }
        }

        function getEventHost(e) {
          // on touchend event, we have to use `e.changedTouches`
          // see http://stackoverflow.com/questions/7192563/touchend-event-properties
          // see https://github.com/bevacqua/dragula/issues/34
          if (e.targetTouches && e.targetTouches.length) {
            return e.targetTouches[0];
          }
          if (e.changedTouches && e.changedTouches.length) {
            return e.changedTouches[0];
          }
          return e;
        }

        function getCoord(coord, e) {
          var host = getEventHost(e);
          var missMap = {
            pageX: 'clientX', // IE8
            pageY: 'clientY' // IE8
          };
          if (coord in missMap && !(coord in host) && missMap[coord] in host) {
            coord = missMap[coord];
          }
          return host[coord];
        }

        module.exports = dragula;
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "./classes": 1, "contra/emitter": 5, "crossvent": 6 }], 3: [function (require, module, exports) {
      module.exports = function atoa(a, n) {
        return Array.prototype.slice.call(a, n);
      };
    }, {}], 4: [function (require, module, exports) {
      'use strict';

      var ticky = require('ticky');

      module.exports = function debounce(fn, args, ctx) {
        if (!fn) {
          return;
        }
        ticky(function run() {
          fn.apply(ctx || null, args || []);
        });
      };
    }, { "ticky": 9 }], 5: [function (require, module, exports) {
      'use strict';

      var atoa = require('atoa');
      var debounce = require('./debounce');

      module.exports = function emitter(thing, options) {
        var opts = options || {};
        var evt = {};
        if (thing === undefined) {
          thing = {};
        }
        thing.on = function (type, fn) {
          if (!evt[type]) {
            evt[type] = [fn];
          } else {
            evt[type].push(fn);
          }
          return thing;
        };
        thing.once = function (type, fn) {
          fn._once = true; // thing.off(fn) still works!
          thing.on(type, fn);
          return thing;
        };
        thing.off = function (type, fn) {
          var c = arguments.length;
          if (c === 1) {
            delete evt[type];
          } else if (c === 0) {
            evt = {};
          } else {
            var et = evt[type];
            if (!et) {
              return thing;
            }
            et.splice(et.indexOf(fn), 1);
          }
          return thing;
        };
        thing.emit = function () {
          var args = atoa(arguments);
          return thing.emitterSnapshot(args.shift()).apply(this, args);
        };
        thing.emitterSnapshot = function (type) {
          var et = (evt[type] || []).slice(0);
          return function () {
            var args = atoa(arguments);
            var ctx = this || thing;
            if (type === 'error' && opts.throws !== false && !et.length) {
              throw args.length === 1 ? args[0] : args;
            }
            et.forEach(function emitter(listen) {
              if (opts.async) {
                debounce(listen, args, ctx);
              } else {
                listen.apply(ctx, args);
              }
              if (listen._once) {
                thing.off(type, listen);
              }
            });
            return thing;
          };
        };
        return thing;
      };
    }, { "./debounce": 4, "atoa": 3 }], 6: [function (require, module, exports) {
      (function (global) {
        'use strict';

        var customEvent = require('custom-event');
        var eventmap = require('./eventmap');
        var doc = global.document;
        var addEvent = addEventEasy;
        var removeEvent = removeEventEasy;
        var hardCache = [];

        if (!global.addEventListener) {
          addEvent = addEventHard;
          removeEvent = removeEventHard;
        }

        module.exports = {
          add: addEvent,
          remove: removeEvent,
          fabricate: fabricateEvent
        };

        function addEventEasy(el, type, fn, capturing) {
          return el.addEventListener(type, fn, capturing);
        }

        function addEventHard(el, type, fn) {
          return el.attachEvent('on' + type, wrap(el, type, fn));
        }

        function removeEventEasy(el, type, fn, capturing) {
          return el.removeEventListener(type, fn, capturing);
        }

        function removeEventHard(el, type, fn) {
          var listener = unwrap(el, type, fn);
          if (listener) {
            return el.detachEvent('on' + type, listener);
          }
        }

        function fabricateEvent(el, type, model) {
          var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
          if (el.dispatchEvent) {
            el.dispatchEvent(e);
          } else {
            el.fireEvent('on' + type, e);
          }
          function makeClassicEvent() {
            var e;
            if (doc.createEvent) {
              e = doc.createEvent('Event');
              e.initEvent(type, true, true);
            } else if (doc.createEventObject) {
              e = doc.createEventObject();
            }
            return e;
          }
          function makeCustomEvent() {
            return new customEvent(type, { detail: model });
          }
        }

        function wrapperFactory(el, type, fn) {
          return function wrapper(originalEvent) {
            var e = originalEvent || global.event;
            e.target = e.target || e.srcElement;
            e.preventDefault = e.preventDefault || function preventDefault() {
              e.returnValue = false;
            };
            e.stopPropagation = e.stopPropagation || function stopPropagation() {
              e.cancelBubble = true;
            };
            e.which = e.which || e.keyCode;
            fn.call(el, e);
          };
        }

        function wrap(el, type, fn) {
          var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
          hardCache.push({
            wrapper: wrapper,
            element: el,
            type: type,
            fn: fn
          });
          return wrapper;
        }

        function unwrap(el, type, fn) {
          var i = find(el, type, fn);
          if (i) {
            var wrapper = hardCache[i].wrapper;
            hardCache.splice(i, 1); // free up a tad of memory
            return wrapper;
          }
        }

        function find(el, type, fn) {
          var i, item;
          for (i = 0; i < hardCache.length; i++) {
            item = hardCache[i];
            if (item.element === el && item.type === type && item.fn === fn) {
              return i;
            }
          }
        }
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, { "./eventmap": 7, "custom-event": 8 }], 7: [function (require, module, exports) {
      (function (global) {
        'use strict';

        var eventmap = [];
        var eventname = '';
        var ron = /^on/;

        for (eventname in global) {
          if (ron.test(eventname)) {
            eventmap.push(eventname.slice(2));
          }
        }

        module.exports = eventmap;
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}], 8: [function (require, module, exports) {
      (function (global) {

        var NativeCustomEvent = global.CustomEvent;

        function useNative() {
          try {
            var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
            return 'cat' === p.type && 'bar' === p.detail.foo;
          } catch (e) {}
          return false;
        }

        /**
         * Cross-browser `CustomEvent` constructor.
         *
         * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
         *
         * @public
         */

        module.exports = useNative() ? NativeCustomEvent :

        // IE >= 9
        'function' === typeof document.createEvent ? function CustomEvent(type, params) {
          var e = document.createEvent('CustomEvent');
          if (params) {
            e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
          } else {
            e.initCustomEvent(type, false, false, void 0);
          }
          return e;
        } :

        // IE <= 8
        function CustomEvent(type, params) {
          var e = document.createEventObject();
          e.type = type;
          if (params) {
            e.bubbles = Boolean(params.bubbles);
            e.cancelable = Boolean(params.cancelable);
            e.detail = params.detail;
          } else {
            e.bubbles = false;
            e.cancelable = false;
            e.detail = void 0;
          }
          return e;
        };
      }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {}], 9: [function (require, module, exports) {
      var si = typeof setImmediate === 'function',
          tick;
      if (si) {
        tick = function (fn) {
          setImmediate(fn);
        };
      } else {
        tick = function (fn) {
          setTimeout(fn, 0);
        };
      }

      module.exports = tick;
    }, {}] }, {}, [2])(2);
});
(function ($, Drupal, drupalSettings, CKEDITOR) {

  Drupal.behaviors.draggableItems = {
    attach: function (context, settings) {

      $('.draggable-items-container').each(function (e) {
        if (!$(this).hasClass('dragula-processed')) {
          initDraggableItems($(this));
          $(this).addClass('dragula-processed');
        }
      });
    }
  };

  // Make sure this WAS a wysiwyg initially, not any textarea, maybe selectors or something
  function initCkeditorFromSavedStatus(el, draggedItems) {
    $.each(draggedItems, function (i, value) {
      if ($(el).find('#' + value.id).length && value.config) {
        var newEditor = CKEDITOR.replace(value.id, value.config);
        newEditor.on('instanceReady', function () {
          newEditor.setData(value.content);
        });
      }
    });
  }

  function initDraggableItems($draggableItemContainers) {
    // Declare variables for the currently dragged item so they can be accessed in any even handler
    var draggedItems = [];

    // Initialize dragula on draggable containers
    var drake = dragula([$draggableItemContainers[0]], {
      // Only handle drags items
      moves: function (el, container, handle) {
        return $(el).children('.dragula-handle')[0] === $(handle)[0];
      },
      // Drop can only happen in source element
      accepts: function (el, target, source, sibling) {
        return target === source;
      }
    });

    // On drop we need to recreate the editor from saved config
    drake.on('drop', function (el, target, source, sibling) {
      adjustOrder(drake);
      initCkeditorFromSavedStatus(el, draggedItems);
    });

    // On cancel we need to recreate the editor from saved config
    drake.on('cancel', function (el, container, source) {
      initCkeditorFromSavedStatus(el, draggedItems);
    });

    // On drag start we need to save the config from the ckeditor instance and destroy it
    drake.on('drag', function (el, source) {
      // On drag start, reset the array to empty so you don't try to initialize the same element multiple times
      draggedItems = [];
      // Get id from textarea
      var $wysiwygs = $(el).find('.cke').siblings('textarea');
      $wysiwygs.each(function (i, el) {
        var draggedItemId = $(this).attr('id');
        if (CKEDITOR.instances[draggedItemId]) {
          var draggedItemInstance = CKEDITOR.instances[draggedItemId];
          var draggedItemConfig = draggedItemInstance.config;
          var draggedItemContent = draggedItemInstance.getData();
          draggedItems.push({
            id: draggedItemId,
            instance: draggedItemInstance,
            config: draggedItemConfig,
            content: draggedItemContent
          });
          if (draggedItemInstance) {
            draggedItemInstance.destroy(true);
          }
        }
      });
    });

    // Init dom-autoscroller for each drake instance
    var scroll = autoScroll([window], {
      margin: 70,
      maxSpeed: 14,
      autoScroll: function () {
        return this.down && drake.dragging;
      }
    });
  }

  function adjustOrder(dragulaObject) {
    var $draggableItems = $(dragulaObject.containers[0]).children();
    $draggableItems.each(function (i, el) {
      // Because drupal has no useful selectors on the admin side and adds wrappers for newly created paragraphs,
      // we need to do this hanky panky to make sure we are only adjusting the weights of the currently adjusted items
      var $weightSelect = $(this).children('div').children('div').children('.form-type-select').children('select'),
          $weightSelectAjax = $(this).children('.ajax-new-content').children('div').children('div').children('.form-type-select').children('select');
      if ($weightSelect.length > 0) {
        $weightSelect.val(i);
      } else if ($weightSelectAjax.length > 0) {
        $weightSelectAjax.val(i);
      } else {
        console.log('Error: Cannot find valid paragraph weight to adjust!');
      }
    });
  }
})(jQuery, Drupal, drupalSettings, CKEDITOR);
/**
 * @file entity-browser-improvements.js
 *
 * Adds extra UI improvements to all entity browsers in the admin theme.
 */

!function ($) {
  "use strict";

  Drupal.behaviors.entityBrowserImprover = {
    attach: function (context, settings) {
      // Add .view-entity-browser-BROWSER-NAME to this list for browsers you want to add the click item functionality
      let $browserSelectors = ['.view-entity-browser-image', '.view-entity-browser-video', '.view-entity-browser-svg'];

      let $browserCol = $($browserSelectors.join(', '), context).find('.views-row');

      $browserCol.click(function () {
        const $col = $(this);

        if ($col.hasClass('entity-browser-improver-processed')) {
          return;
        } else {
          $col.addClass('entity-browser-improver-processed');
        }

        if ($col.hasClass('column-selected')) {
          uncheckColumn($col);
          return;
        }

        $browserCol.each(function () {
          uncheckColumn($(this));
        });

        checkColumn($col);
      });
    }
  };

  function uncheckColumn($target) {
    $target.find('input[type="checkbox"]').prop("checked", false);
    $target.removeClass('column-selected');
  }

  function checkColumn($target) {
    $target.find('input[type="checkbox"]').prop("checked", true);
    $target.addClass('column-selected');
  }
}(jQuery);
/**
 * paragraphs-improvements.js
 * Improve the paragraphs admin ui
 */

!function ($) {
  "use strict";

  Drupal.behaviors.paragraphsPreviewerImprover = {
    attach: function (context, settings) {
      var $previewerButtons = $('.link.paragraphs-previewer', context);

      $previewerButtons.each((i, el) => {
        var $previewerButton = $(el);
        replaceParagraphName($previewerButton);
      });

      // Get paragraphs previews by only targeting ones with the .paragraph-type-top as a sibling
      // so nested paragraphs previews don't break
      var $paragraphsTopElements = $('.paragraph-type-top', context);
      var $paragraphsPreviews = $paragraphsTopElements.siblings('.paragraph--view-mode--preview');

      formatParagraphsPreviews($paragraphsPreviews);

      // Necessary for paragraphs previews behind tabs
      $('.vertical-tabs__menu a').on("click", () => {
        formatParagraphsPreviews($paragraphsPreviews);
      });
    }
  };

  Drupal.behaviors.paragraphsHelperClasses = {
    attach: function (context, settings) {
      var $confirmRemoveButtons = $('.confirm-remove');

      $confirmRemoveButtons.each(function (i, el) {
        $(el).closest('.admin-paragraphs-draggable-item, .admin-paragraphs-single').addClass('paragraph-confirm-delete');
      });
    }
  };

  // Because drupal behaviors are so annoying, add delegated click handler here, couldn't get it to work properly
  // inside the behavior
  $(document).ready(function () {
    $('body').on('click', '.paragraph--view-mode--preview', function () {
      $(this).toggleClass('expanded');
    });
  });

  /**
   * Add the type to the previewer button if you want
   * @param previewerButton
   */
  function replaceParagraphName(previewerButton) {
    var paragraphName = previewerButton.siblings('.paragraph-type-title').text();
    previewerButton.val(`Preview: ${paragraphName}`);
  }

  /**
   * Format the previews to be expandable
   * @param paragraphsPreviews
   */
  function formatParagraphsPreviews(paragraphsPreviews) {
    paragraphsPreviews.each((i, el) => {
      var $this = $(el);
      if ($this.outerHeight() >= 100) {
        $this.addClass('expandable');
      }
    });
  }
}(jQuery);
/**
 * @file inject-svg.js
 *
 * Use svg-injector.js to replace an svg <img> tag with the inline svg.
 */

!function ($) {
  "use strict";

  $(function () {
    // Elements to inject
    let mySVGsToInject = document.querySelectorAll('img.inject-me');

    // Do the injection
    SVGInjector(mySVGsToInject);
  });
}(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN2Zy1pbmplY3Rvci5qcyIsImRvbS1hdXRvc2Nyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiY2xhc3Nlcy5qcyIsImRyYWd1bGEuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9kZWJvdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvZW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlcy9jcm9zc3ZlbnQvc3JjL2Nyb3NzdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9jcm9zc3ZlbnQvc3JjL2V2ZW50bWFwLmpzIiwibm9kZV9tb2R1bGVzL2N1c3RvbS1ldmVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90aWNreS90aWNreS1icm93c2VyLmpzIiwiZHJhZ2dhYmxlLWl0ZW1zLmpzIiwiZW50aXR5LWJyb3dzZXItaW1wcm92bWVudHMuanMiLCJleHBhbmRhYmxlLXBhcmFncmFwaHMuanMiLCJpbmplY3Qtc3ZnLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsImRvY3VtZW50IiwiaXNMb2NhbCIsImxvY2F0aW9uIiwicHJvdG9jb2wiLCJoYXNTdmdTdXBwb3J0IiwiaW1wbGVtZW50YXRpb24iLCJoYXNGZWF0dXJlIiwidW5pcXVlQ2xhc3NlcyIsImxpc3QiLCJzcGxpdCIsImhhc2giLCJpIiwibGVuZ3RoIiwib3V0IiwiaGFzT3duUHJvcGVydHkiLCJ1bnNoaWZ0Iiwiam9pbiIsImZvckVhY2giLCJBcnJheSIsInByb3RvdHlwZSIsImZuIiwic2NvcGUiLCJUeXBlRXJyb3IiLCJsZW4iLCJjYWxsIiwic3ZnQ2FjaGUiLCJpbmplY3RDb3VudCIsImluamVjdGVkRWxlbWVudHMiLCJyZXF1ZXN0UXVldWUiLCJyYW5TY3JpcHRzIiwiY2xvbmVTdmciLCJzb3VyY2VTdmciLCJjbG9uZU5vZGUiLCJxdWV1ZVJlcXVlc3QiLCJ1cmwiLCJjYWxsYmFjayIsInB1c2giLCJwcm9jZXNzUmVxdWVzdFF1ZXVlIiwiaW5kZXgiLCJzZXRUaW1lb3V0IiwibG9hZFN2ZyIsInVuZGVmaW5lZCIsIlNWR1NWR0VsZW1lbnQiLCJYTUxIdHRwUmVxdWVzdCIsImh0dHBSZXF1ZXN0Iiwib25yZWFkeXN0YXRlY2hhbmdlIiwicmVhZHlTdGF0ZSIsInN0YXR1cyIsInJlc3BvbnNlWE1MIiwiRG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJET01QYXJzZXIiLCJGdW5jdGlvbiIsInhtbERvYyIsInBhcnNlciIsInBhcnNlRnJvbVN0cmluZyIsInJlc3BvbnNlVGV4dCIsImUiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInN0YXR1c1RleHQiLCJvcGVuIiwib3ZlcnJpZGVNaW1lVHlwZSIsInNlbmQiLCJpbmplY3RFbGVtZW50IiwiZWwiLCJldmFsU2NyaXB0cyIsInBuZ0ZhbGxiYWNrIiwiaW1nVXJsIiwiZ2V0QXR0cmlidXRlIiwidGVzdCIsInBlckVsZW1lbnRGYWxsYmFjayIsInNldEF0dHJpYnV0ZSIsInBvcCIsInJlcGxhY2UiLCJpbmRleE9mIiwic3ZnIiwiaW1nSWQiLCJpbWdUaXRsZSIsImNsYXNzTWVyZ2UiLCJjb25jYXQiLCJpbWdTdHlsZSIsImltZ0RhdGEiLCJmaWx0ZXIiLCJhdHRyaWJ1dGVzIiwiYXQiLCJuYW1lIiwiZGF0YUF0dHIiLCJ2YWx1ZSIsImlyaUVsZW1lbnRzQW5kUHJvcGVydGllcyIsImVsZW1lbnQiLCJlbGVtZW50RGVmcyIsInByb3BlcnRpZXMiLCJjdXJyZW50SWQiLCJuZXdJZCIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZWxlbWVudHNMZW4iLCJpZCIsInJlZmVyZW5jaW5nRWxlbWVudHMiLCJwcm9wZXJ0eSIsImoiLCJyZWZlcmVuY2luZ0VsZW1lbnRMZW4iLCJyZW1vdmVBdHRyaWJ1dGUiLCJzY3JpcHRzIiwic2NyaXB0c1RvRXZhbCIsInNjcmlwdCIsInNjcmlwdFR5cGUiLCJrIiwic2NyaXB0c0xlbiIsImlubmVyVGV4dCIsInRleHRDb250ZW50IiwicmVtb3ZlQ2hpbGQiLCJsIiwic2NyaXB0c1RvRXZhbExlbiIsInN0eWxlVGFncyIsInN0eWxlVGFnIiwicGFyZW50Tm9kZSIsInJlcGxhY2VDaGlsZCIsIlNWR0luamVjdG9yIiwiZWxlbWVudHMiLCJvcHRpb25zIiwiZG9uZSIsImVhY2hDYWxsYmFjayIsImVhY2giLCJlbGVtZW50c0xvYWRlZCIsIm1vZHVsZSIsImV4cG9ydHMiLCJkZWZpbmUiLCJhbWQiLCJhdXRvU2Nyb2xsIiwiZ2V0RGVmIiwiZiIsImQiLCJib29sZWFuIiwiZnVuYyIsImRlZiIsImFyZ3VtZW50cyQxIiwiYXJndW1lbnRzIiwiX2xlbiIsImFyZ3MiLCJfa2V5IiwiYXBwbHkiLCJwcmVmaXgiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJsaW1pdCIsImxhc3RUaW1lIiwibm93IiwiRGF0ZSIsImdldFRpbWUiLCJ0dGMiLCJNYXRoIiwibWF4IiwidGltZXIiLCJiaW5kIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJjbGVhclRpbWVvdXQiLCJfdHlwZW9mIiwiU3ltYm9sIiwiaXRlcmF0b3IiLCJvYmoiLCJjb25zdHJ1Y3RvciIsImlzRWxlbWVudCIsImlucHV0Iiwibm9kZVR5cGUiLCJzdHlsZSIsIm93bmVyRG9jdW1lbnQiLCJpbmRleE9mRWxlbWVudCIsInJlc29sdmVFbGVtZW50IiwiaGFzRWxlbWVudCIsInB1c2hFbGVtZW50cyIsInRvQWRkIiwiYWRkRWxlbWVudHMiLCJfbGVuMiIsIl9rZXkyIiwibWFwIiwicmVtb3ZlRWxlbWVudHMiLCJfbGVuMyIsInRvUmVtb3ZlIiwiX2tleTMiLCJyZWR1Y2UiLCJsYXN0IiwiaW5kZXgkJDEiLCJzcGxpY2UiLCJub1Rocm93IiwicXVlcnlTZWxlY3RvciIsImluZGV4JDIiLCJjcmVhdGVQb2ludENCIiwib2JqZWN0IiwiYWxsb3dVcGRhdGUiLCJwb2ludENCIiwiZXZlbnQiLCJ0YXJnZXQiLCJzcmNFbGVtZW50Iiwib3JpZ2luYWxUYXJnZXQiLCJ0eXBlIiwidGFyZ2V0VG91Y2hlcyIsIngiLCJjbGllbnRYIiwieSIsImNsaWVudFkiLCJwYWdlWCIsInBhZ2VZIiwiZXZlbnREb2MiLCJkb2MiLCJib2R5Iiwic2Nyb2xsTGVmdCIsImNsaWVudExlZnQiLCJzY3JvbGxUb3AiLCJjbGllbnRUb3AiLCJjcmVhdGVXaW5kb3dSZWN0IiwicHJvcHMiLCJ0b3AiLCJlbnVtZXJhYmxlIiwibGVmdCIsInJpZ2h0IiwiaW5uZXJXaWR0aCIsImJvdHRvbSIsImlubmVySGVpZ2h0Iiwid2lkdGgiLCJoZWlnaHQiLCJjcmVhdGUiLCJyZWN0IiwiZGVmaW5lUHJvcGVydGllcyIsImdldENsaWVudFJlY3QiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJwb2ludEluc2lkZSIsInBvaW50Iiwib2JqZWN0Q3JlYXRlIiwiVGVtcCIsInByb3BlcnRpZXNPYmplY3QiLCJyZXN1bHQiLCJfX3Byb3RvX18iLCJvYmplY3RDcmVhdGUkMSIsIm1vdXNlRXZlbnRQcm9wcyIsImNyZWF0ZURpc3BhdGNoZXIiLCJkZWZhdWx0U2V0dGluZ3MiLCJzY3JlZW5YIiwic2NyZWVuWSIsImN0cmxLZXkiLCJzaGlmdEtleSIsImFsdEtleSIsIm1ldGFLZXkiLCJidXR0b24iLCJidXR0b25zIiwicmVsYXRlZFRhcmdldCIsInJlZ2lvbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJvbk1vdmUiLCJkaXNwYXRjaCIsIk1vdXNlRXZlbnQiLCJtMSIsImluaXRNb3ZlIiwiZGF0YSIsImV2dCIsImNyZWF0ZU1vdmVJbml0Iiwic2V0U3BlY2lhbCIsImRpc3BhdGNoRXZlbnQiLCJjcmVhdGVFdmVudCIsIm0yIiwic2V0dGluZ3MiLCJpbml0TW91c2VFdmVudCIsImNyZWF0ZUV2ZW50T2JqZWN0IiwibTMiLCJkZXN0cm95IiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImNvbnNvbGUiLCJsb2ciLCJkaXNwYXRjaGVkIiwiQXV0b1Njcm9sbGVyIiwic2VsZiIsIm1heFNwZWVkIiwic2Nyb2xsaW5nIiwibWFyZ2luIiwic2Nyb2xsV2hlbk91dHNpZGUiLCJkaXNwYXRjaGVyIiwiZG93biIsImlzTmFOIiwic3luY01vdmUiLCJvbkRvd24iLCJvblVwIiwic2V0U2Nyb2xsIiwiYWRkIiwicmVtb3ZlIiwiaGFzV2luZG93Iiwid2luZG93QW5pbWF0aW9uRnJhbWUiLCJ0b1N0cmluZyIsInRlbXAiLCJnZXQiLCJuIiwiY3VycmVudCIsImFuaW1hdGlvbkZyYW1lIiwib25Nb3VzZU91dCIsImdldFRhcmdldCIsImdldEVsZW1lbnRVbmRlclBvaW50IiwidW5kZXJQb2ludCIsImluc2lkZSIsInNjcm9sbFdpbmRvdyIsInNjcm9sbFRpY2siLCJzY3JvbGx4Iiwic2Nyb2xseSIsImZsb29yIiwiY2VpbCIsIm1pbiIsInNjcm9sbFkiLCJzY3JvbGxYIiwiYW1vdW50Iiwic2Nyb2xsVG8iLCJwYWdlWE9mZnNldCIsInBhZ2VZT2Zmc2V0IiwiQXV0b1Njcm9sbGVyRmFjdG9yeSIsIiQiLCJEcnVwYWwiLCJkcnVwYWxTZXR0aW5ncyIsIkNLRURJVE9SIiwiYmVoYXZpb3JzIiwiZHJhZ2dhYmxlSXRlbXMiLCJhdHRhY2giLCJjb250ZXh0IiwiaGFzQ2xhc3MiLCJpbml0RHJhZ2dhYmxlSXRlbXMiLCJhZGRDbGFzcyIsImluaXRDa2VkaXRvckZyb21TYXZlZFN0YXR1cyIsImRyYWdnZWRJdGVtcyIsImZpbmQiLCJjb25maWciLCJuZXdFZGl0b3IiLCJvbiIsInNldERhdGEiLCJjb250ZW50IiwiJGRyYWdnYWJsZUl0ZW1Db250YWluZXJzIiwiZHJha2UiLCJkcmFndWxhIiwibW92ZXMiLCJjb250YWluZXIiLCJoYW5kbGUiLCJjaGlsZHJlbiIsImFjY2VwdHMiLCJzb3VyY2UiLCJzaWJsaW5nIiwiYWRqdXN0T3JkZXIiLCIkd3lzaXd5Z3MiLCJzaWJsaW5ncyIsImRyYWdnZWRJdGVtSWQiLCJhdHRyIiwiaW5zdGFuY2VzIiwiZHJhZ2dlZEl0ZW1JbnN0YW5jZSIsImRyYWdnZWRJdGVtQ29uZmlnIiwiZHJhZ2dlZEl0ZW1Db250ZW50IiwiZ2V0RGF0YSIsImluc3RhbmNlIiwic2Nyb2xsIiwiZHJhZ2dpbmciLCJkcmFndWxhT2JqZWN0IiwiJGRyYWdnYWJsZUl0ZW1zIiwiY29udGFpbmVycyIsIiR3ZWlnaHRTZWxlY3QiLCIkd2VpZ2h0U2VsZWN0QWpheCIsInZhbCIsImpRdWVyeSIsImVudGl0eUJyb3dzZXJJbXByb3ZlciIsIiRicm93c2VyU2VsZWN0b3JzIiwiJGJyb3dzZXJDb2wiLCJjbGljayIsIiRjb2wiLCJ1bmNoZWNrQ29sdW1uIiwiY2hlY2tDb2x1bW4iLCIkdGFyZ2V0IiwicHJvcCIsInJlbW92ZUNsYXNzIiwicGFyYWdyYXBoc1ByZXZpZXdlckltcHJvdmVyIiwiJHByZXZpZXdlckJ1dHRvbnMiLCIkcHJldmlld2VyQnV0dG9uIiwicmVwbGFjZVBhcmFncmFwaE5hbWUiLCIkcGFyYWdyYXBoc1RvcEVsZW1lbnRzIiwiJHBhcmFncmFwaHNQcmV2aWV3cyIsImZvcm1hdFBhcmFncmFwaHNQcmV2aWV3cyIsInBhcmFncmFwaHNIZWxwZXJDbGFzc2VzIiwiJGNvbmZpcm1SZW1vdmVCdXR0b25zIiwiY2xvc2VzdCIsInJlYWR5IiwidG9nZ2xlQ2xhc3MiLCJwcmV2aWV3ZXJCdXR0b24iLCJwYXJhZ3JhcGhOYW1lIiwidGV4dCIsInBhcmFncmFwaHNQcmV2aWV3cyIsIiR0aGlzIiwib3V0ZXJIZWlnaHQiLCJteVNWR3NUb0luamVjdCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0FBUUMsV0FBVUEsTUFBVixFQUFrQkMsUUFBbEIsRUFBNEI7O0FBRTNCOztBQUVBOztBQUNBLE1BQUlDLFVBQVVGLE9BQU9HLFFBQVAsQ0FBZ0JDLFFBQWhCLEtBQTZCLE9BQTNDO0FBQ0EsTUFBSUMsZ0JBQWdCSixTQUFTSyxjQUFULENBQXdCQyxVQUF4QixDQUFtQyxtREFBbkMsRUFBd0YsS0FBeEYsQ0FBcEI7O0FBRUEsV0FBU0MsYUFBVCxDQUF1QkMsSUFBdkIsRUFBNkI7QUFDM0JBLFdBQU9BLEtBQUtDLEtBQUwsQ0FBVyxHQUFYLENBQVA7O0FB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QkFBekIsRUFBa0QwQyxJQUFsRCxFQUFwQjtBQUNBRixvQkFBZ0J4QixHQUFoQixDQUFxQixZQUFXeUIsYUFBYyxFQUE5QztBQUNEOztBQUVEOzs7O0FBSUEsV0FBU1Asd0JBQVQsQ0FBa0NTLGtCQUFsQyxFQUFzRDtBQUNwREEsdUJBQW1CclEsSUFBbkIsQ0FBd0IsQ0FBQ2xILENBQUQsRUFBSXFELEVBQUosS0FBVztBQUNqQyxVQUFJbVUsUUFBUTNFLEVBQUV4UCxFQUFGLENBQVo7QUFDQSxVQUFJbVUsTUFBTUMsV0FBTixNQUF1QixHQUEzQixFQUFnQztBQUM5QkQsY0FBTWpFLFFBQU4sQ0FBZSxZQUFmO0FBQ0Q7QUFDRixLQUxEO0FBTUQ7QUFFRixDQWxFQSxDQWtFQ3NDLE1BbEVELENBQUQ7QUNMQTs7Ozs7O0FBTUEsQ0FBQyxVQUFTaEQsQ0FBVCxFQUFXO0FBQ1Y7O0FBRUFBLElBQUUsWUFBVztBQUNYO0FBQ0EsUUFBSTZFLGlCQUFpQnJZLFNBQVNpRyxnQkFBVCxDQUEwQixlQUExQixDQUFyQjs7QUFFQTtBQUNBdUIsZ0JBQVk2USxjQUFaO0FBQ0QsR0FORDtBQVFELENBWEEsQ0FXQzdCLE1BWEQsQ0FBRCIsImZpbGUiOiJhZG1pbmtpdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU1ZHSW5qZWN0b3IgdjEuMS4zIC0gRmFzdCwgY2FjaGluZywgZHluYW1pYyBpbmxpbmUgU1ZHIERPTSBpbmplY3Rpb24gbGlicmFyeVxuICogaHR0cHM6Ly9naXRodWIuY29tL2ljb25pYy9TVkdJbmplY3RvclxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1IFdheWJ1cnkgPGhlbGxvQHdheWJ1cnkuY29tPlxuICogQGxpY2Vuc2UgTUlUXG4gKi9cblxuKGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEVudmlyb25tZW50XG4gIHZhciBpc0xvY2FsID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnZmlsZTonO1xuICB2YXIgaGFzU3ZnU3VwcG9ydCA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmhhc0ZlYXR1cmUoJ2h0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjQmFzaWNTdHJ1Y3R1cmUnLCAnMS4xJyk7XG5cbiAgZnVuY3Rpb24gdW5pcXVlQ2xhc3NlcyhsaXN0KSB7XG4gICAgbGlzdCA9IGxpc3Quc3BsaXQoJyAnKTtcblxuICAgIHZhciBoYXNoID0ge307XG4gICAgdmFyIGkgPSBsaXN0Lmxlbmd0aDtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBpZiAoIWhhc2guaGFzT3duUHJvcGVydHkobGlzdFtpXSkpIHtcbiAgICAgICAgaGFzaFtsaXN0W2ldXSA9IDE7XG4gICAgICAgIG91dC51bnNoaWZ0KGxpc3RbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQuam9pbignICcpO1xuICB9XG5cbiAgLyoqXG4gICAqIGNhY2hlIChvciBwb2x5ZmlsbCBmb3IgPD0gSUU4KSBBcnJheS5mb3JFYWNoKClcbiAgICogc291cmNlOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9mb3JFYWNoXG4gICAqL1xuICB2YXIgZm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoIHx8IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgICBpZiAodGhpcyA9PT0gdm9pZCAwIHx8IHRoaXMgPT09IG51bGwgfHwgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XG4gICAgfVxuXG4gICAgLyoganNoaW50IGJpdHdpc2U6IGZhbHNlICovXG4gICAgdmFyIGksIGxlbiA9IHRoaXMubGVuZ3RoID4+PiAwO1xuICAgIC8qIGpzaGludCBiaXR3aXNlOiB0cnVlICovXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGlmIChpIGluIHRoaXMpIHtcbiAgICAgICAgZm4uY2FsbChzY29wZSwgdGhpc1tpXSwgaSwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFNWRyBDYWNoZVxuICB2YXIgc3ZnQ2FjaGUgPSB7fTtcblxuICB2YXIgaW5qZWN0Q291bnQgPSAwO1xuICB2YXIgaW5qZWN0ZWRFbGVtZW50cyA9IFtdO1xuXG4gIC8vIFJlcXVlc3QgUXVldWVcbiAgdmFyIHJlcXVlc3RRdWV1ZSA9IFtdO1xuXG4gIC8vIFNjcmlwdCBydW5uaW5nIHN0YXR1c1xuICB2YXIgcmFuU2NyaXB0cyA9IHt9O1xuXG4gIHZhciBjbG9uZVN2ZyA9IGZ1bmN0aW9uIChzb3VyY2VTdmcpIHtcbiAgICByZXR1cm4gc291cmNlU3ZnLmNsb25lTm9kZSh0cnVlKTtcbiAgfTtcblxuICB2YXIgcXVldWVSZXF1ZXN0ID0gZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcbiAgICByZXF1ZXN0UXVldWVbdXJsXSA9IHJlcXVlc3RRdWV1ZVt1cmxdIHx8IFtdO1xuICAgIHJlcXVlc3RRdWV1ZVt1cmxdLnB1c2goY2FsbGJhY2spO1xuICB9O1xuXG4gIHZhciBwcm9jZXNzUmVxdWVzdFF1ZXVlID0gZnVuY3Rpb24gKHVybCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSByZXF1ZXN0UXVldWVbdXJsXS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgLy8gTWFrZSB0aGVzZSBjYWxscyBhc3luYyBzbyB3ZSBhdm9pZCBibG9ja2luZyB0aGUgcGFnZS9yZW5kZXJlclxuICAgICAgLyoganNoaW50IGxvb3BmdW5jOiB0cnVlICovXG4gICAgICAoZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJlcXVlc3RRdWV1ZVt1cmxdW2luZGV4XShjbG9uZVN2ZyhzdmdDYWNoZVt1cmxdKSk7XG4gICAgICAgIH0sIDApO1xuICAgICAgfSkoaSk7XG4gICAgICAvKiBqc2hpbnQgbG9vcGZ1bmM6IGZhbHNlICovXG4gICAgfVxuICB9O1xuXG4gIHZhciBsb2FkU3ZnID0gZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcbiAgICBpZiAoc3ZnQ2FjaGVbdXJsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoc3ZnQ2FjaGVbdXJsXSBpbnN0YW5jZW9mIFNWR1NWR0VsZW1lbnQpIHtcbiAgICAgICAgLy8gV2UgYWxyZWFkeSBoYXZlIGl0IGluIGNhY2hlLCBzbyB1c2UgaXRcbiAgICAgICAgY2FsbGJhY2soY2xvbmVTdmcoc3ZnQ2FjaGVbdXJsXSkpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIFdlIGRvbid0IGhhdmUgaXQgaW4gY2FjaGUgeWV0LCBidXQgd2UgYXJlIGxvYWRpbmcgaXQsIHNvIHF1ZXVlIHRoaXMgcmVxdWVzdFxuICAgICAgICBxdWV1ZVJlcXVlc3QodXJsLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuXG4gICAgICBpZiAoIXdpbmRvdy5YTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICBjYWxsYmFjaygnQnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFhNTEh0dHBSZXF1ZXN0Jyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gU2VlZCB0aGUgY2FjaGUgdG8gaW5kaWNhdGUgd2UgYXJlIGxvYWRpbmcgdGhpcyBVUkwgYWxyZWFkeVxuICAgICAgc3ZnQ2FjaGVbdXJsXSA9IHt9O1xuICAgICAgcXVldWVSZXF1ZXN0KHVybCwgY2FsbGJhY2spO1xuXG4gICAgICB2YXIgaHR0cFJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgaHR0cFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyByZWFkeVN0YXRlIDQgPSBjb21wbGV0ZVxuICAgICAgICBpZiAoaHR0cFJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCkge1xuXG4gICAgICAgICAgLy8gSGFuZGxlIHN0YXR1c1xuICAgICAgICAgIGlmIChodHRwUmVxdWVzdC5zdGF0dXMgPT09IDQwNCB8fCBodHRwUmVxdWVzdC5yZXNwb25zZVhNTCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY2FsbGJhY2soJ1VuYWJsZSB0byBsb2FkIFNWRyBmaWxlOiAnICsgdXJsKTtcblxuICAgICAgICAgICAgaWYgKGlzTG9jYWwpIGNhbGxiYWNrKCdOb3RlOiBTVkcgaW5qZWN0aW9uIGFqYXggY2FsbHMgZG8gbm90IHdvcmsgbG9jYWxseSB3aXRob3V0IGFkanVzdGluZyBzZWN1cml0eSBzZXR0aW5nIGluIHlvdXIgYnJvd3Nlci4gT3IgY29uc2lkZXIgdXNpbmcgYSBsb2NhbCB3ZWJzZXJ2ZXIuJyk7XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gMjAwIHN1Y2Nlc3MgZnJvbSBzZXJ2ZXIsIG9yIDAgd2hlbiB1c2luZyBmaWxlOi8vIHByb3RvY29sIGxvY2FsbHlcbiAgICAgICAgICBpZiAoaHR0cFJlcXVlc3Quc3RhdHVzID09PSAyMDAgfHwgKGlzTG9jYWwgJiYgaHR0cFJlcXVlc3Quc3RhdHVzID09PSAwKSkge1xuXG4gICAgICAgICAgICAvKiBnbG9iYWxzIERvY3VtZW50ICovXG4gICAgICAgICAgICBpZiAoaHR0cFJlcXVlc3QucmVzcG9uc2VYTUwgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xuICAgICAgICAgICAgICAvLyBDYWNoZSBpdFxuICAgICAgICAgICAgICBzdmdDYWNoZVt1cmxdID0gaHR0cFJlcXVlc3QucmVzcG9uc2VYTUwuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyogZ2xvYmFscyAtRG9jdW1lbnQgKi9cblxuICAgICAgICAgICAgLy8gSUU5IGRvZXNuJ3QgY3JlYXRlIGEgcmVzcG9uc2VYTUwgRG9jdW1lbnQgb2JqZWN0IGZyb20gbG9hZGVkIFNWRyxcbiAgICAgICAgICAgIC8vIGFuZCB0aHJvd3MgYSBcIkRPTSBFeGNlcHRpb246IEhJRVJBUkNIWV9SRVFVRVNUX0VSUiAoMylcIiBlcnJvciB3aGVuIGluamVjdGVkLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIFNvLCB3ZSdsbCBqdXN0IGNyZWF0ZSBvdXIgb3duIG1hbnVhbGx5IHZpYSB0aGUgRE9NUGFyc2VyIHVzaW5nXG4gICAgICAgICAgICAvLyB0aGUgdGhlIHJhdyBYTUwgcmVzcG9uc2VUZXh0LlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIDpOT1RFOiBJRTggYW5kIG9sZGVyIGRvZXNuJ3QgaGF2ZSBET01QYXJzZXIsIGJ1dCB0aGV5IGNhbid0IGRvIFNWRyBlaXRoZXIsIHNvLi4uXG4gICAgICAgICAgICBlbHNlIGlmIChET01QYXJzZXIgJiYgKERPTVBhcnNlciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICB2YXIgeG1sRG9jO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgICAgICAgeG1sRG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhodHRwUmVxdWVzdC5yZXNwb25zZVRleHQsICd0ZXh0L3htbCcpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgeG1sRG9jID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKCF4bWxEb2MgfHwgeG1sRG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdwYXJzZXJlcnJvcicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCdVbmFibGUgdG8gcGFyc2UgU1ZHIGZpbGU6ICcgKyB1cmwpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDYWNoZSBpdFxuICAgICAgICAgICAgICAgIHN2Z0NhY2hlW3VybF0gPSB4bWxEb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlJ3ZlIGxvYWRlZCBhIG5ldyBhc3NldCwgc28gcHJvY2VzcyBhbnkgcmVxdWVzdHMgd2FpdGluZyBmb3IgaXRcbiAgICAgICAgICAgIHByb2Nlc3NSZXF1ZXN0UXVldWUodXJsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygnVGhlcmUgd2FzIGEgcHJvYmxlbSBpbmplY3RpbmcgdGhlIFNWRzogJyArIGh0dHBSZXF1ZXN0LnN0YXR1cyArICcgJyArIGh0dHBSZXF1ZXN0LnN0YXR1c1RleHQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaHR0cFJlcXVlc3Qub3BlbignR0VUJywgdXJsKTtcblxuICAgICAgLy8gVHJlYXQgYW5kIHBhcnNlIHRoZSByZXNwb25zZSBhcyBYTUwsIGV2ZW4gaWYgdGhlXG4gICAgICAvLyBzZXJ2ZXIgc2VuZHMgdXMgYSBkaWZmZXJlbnQgbWltZXR5cGVcbiAgICAgIGlmIChodHRwUmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKSBodHRwUmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKCd0ZXh0L3htbCcpO1xuXG4gICAgICBodHRwUmVxdWVzdC5zZW5kKCk7XG4gICAgfVxuICB9O1xuXG4gIC8vIEluamVjdCBhIHNpbmdsZSBlbGVtZW50XG4gIHZhciBpbmplY3RFbGVtZW50ID0gZnVuY3Rpb24gKGVsLCBldmFsU2NyaXB0cywgcG5nRmFsbGJhY2ssIGNhbGxiYWNrKSB7XG5cbiAgICAvLyBHcmFiIHRoZSBzcmMgb3IgZGF0YS1zcmMgYXR0cmlidXRlXG4gICAgdmFyIGltZ1VybCA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xuXG4gICAgLy8gV2UgY2FuIG9ubHkgaW5qZWN0IFNWR1xuICAgIGlmICghKC9cXC5zdmcvaSkudGVzdChpbWdVcmwpKSB7XG4gICAgICBjYWxsYmFjaygnQXR0ZW1wdGVkIHRvIGluamVjdCBhIGZpbGUgd2l0aCBhIG5vbi1zdmcgZXh0ZW5zaW9uOiAnICsgaW1nVXJsKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIFNWRyBzdXBwb3J0IHRyeSB0byBmYWxsIGJhY2sgdG8gYSBwbmcsXG4gICAgLy8gZWl0aGVyIGRlZmluZWQgcGVyLWVsZW1lbnQgdmlhIGRhdGEtZmFsbGJhY2sgb3IgZGF0YS1wbmcsXG4gICAgLy8gb3IgZ2xvYmFsbHkgdmlhIHRoZSBwbmdGYWxsYmFjayBkaXJlY3Rvcnkgc2V0dGluZ1xuICAgIGlmICghaGFzU3ZnU3VwcG9ydCkge1xuICAgICAgdmFyIHBlckVsZW1lbnRGYWxsYmFjayA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1mYWxsYmFjaycpIHx8IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1wbmcnKTtcblxuICAgICAgLy8gUGVyLWVsZW1lbnQgc3BlY2lmaWMgUE5HIGZhbGxiYWNrIGRlZmluZWQsIHNvIHVzZSB0aGF0XG4gICAgICBpZiAocGVyRWxlbWVudEZhbGxiYWNrKSB7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnc3JjJywgcGVyRWxlbWVudEZhbGxiYWNrKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICB9XG4gICAgICAvLyBHbG9iYWwgUE5HIGZhbGxiYWNrIGRpcmVjdG9yaXkgZGVmaW5lZCwgdXNlIHRoZSBzYW1lLW5hbWVkIFBOR1xuICAgICAgZWxzZSBpZiAocG5nRmFsbGJhY2spIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdzcmMnLCBwbmdGYWxsYmFjayArICcvJyArIGltZ1VybC5zcGxpdCgnLycpLnBvcCgpLnJlcGxhY2UoJy5zdmcnLCAnLnBuZycpKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICB9XG4gICAgICAvLyB1bS4uLlxuICAgICAgZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKCdUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBTVkcgYW5kIG5vIFBORyBmYWxsYmFjayB3YXMgZGVmaW5lZC4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmVuJ3QgYWxyZWFkeSBpbiB0aGUgcHJvY2VzcyBvZiBpbmplY3RpbmcgdGhpcyBlbGVtZW50IHRvXG4gICAgLy8gYXZvaWQgYSByYWNlIGNvbmRpdGlvbiBpZiBtdWx0aXBsZSBpbmplY3Rpb25zIGZvciB0aGUgc2FtZSBlbGVtZW50IGFyZSBydW4uXG4gICAgLy8gOk5PVEU6IFVzaW5nIGluZGV4T2YoKSBvbmx5IF9hZnRlcl8gd2UgY2hlY2sgZm9yIFNWRyBzdXBwb3J0IGFuZCBiYWlsLFxuICAgIC8vIHNvIG5vIG5lZWQgZm9yIElFOCBpbmRleE9mKCkgcG9seWZpbGxcbiAgICBpZiAoaW5qZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsKSAhPT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgcmVxdWVzdCB0byBpbmplY3QgdGhpcyBlbGVtZW50LCBpbiBjYXNlIG90aGVyIGluamVjdGlvblxuICAgIC8vIGNhbGxzIGFyZSBhbHNvIHRyeWluZyB0byByZXBsYWNlIHRoaXMgZWxlbWVudCBiZWZvcmUgd2UgZmluaXNoXG4gICAgaW5qZWN0ZWRFbGVtZW50cy5wdXNoKGVsKTtcblxuICAgIC8vIFRyeSB0byBhdm9pZCBsb2FkaW5nIHRoZSBvcmdpbmFsIGltYWdlIHNyYyBpZiBwb3NzaWJsZS5cbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ3NyYycsICcnKTtcblxuICAgIC8vIExvYWQgaXQgdXBcbiAgICBsb2FkU3ZnKGltZ1VybCwgZnVuY3Rpb24gKHN2Zykge1xuXG4gICAgICBpZiAodHlwZW9mIHN2ZyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHN2ZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY2FsbGJhY2soc3ZnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgaW1nSWQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgICBpZiAoaW1nSWQpIHtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnaWQnLCBpbWdJZCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBpbWdUaXRsZSA9IGVsLmdldEF0dHJpYnV0ZSgndGl0bGUnKTtcbiAgICAgIGlmIChpbWdUaXRsZSkge1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCd0aXRsZScsIGltZ1RpdGxlKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ29uY2F0IHRoZSBTVkcgY2xhc3NlcyArICdpbmplY3RlZC1zdmcnICsgdGhlIGltZyBjbGFzc2VzXG4gICAgICB2YXIgY2xhc3NNZXJnZSA9IFtdLmNvbmNhdChzdmcuZ2V0QXR0cmlidXRlKCdjbGFzcycpIHx8IFtdLCAnaW5qZWN0ZWQtc3ZnJywgZWwuZ2V0QXR0cmlidXRlKCdjbGFzcycpIHx8IFtdKS5qb2luKCcgJyk7XG4gICAgICBzdmcuc2V0QXR0cmlidXRlKCdjbGFzcycsIHVuaXF1ZUNsYXNzZXMoY2xhc3NNZXJnZSkpO1xuXG4gICAgICB2YXIgaW1nU3R5bGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICBpZiAoaW1nU3R5bGUpIHtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBpbWdTdHlsZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvcHkgYWxsIHRoZSBkYXRhIGVsZW1lbnRzIHRvIHRoZSBzdmdcbiAgICAgIHZhciBpbWdEYXRhID0gW10uZmlsdGVyLmNhbGwoZWwuYXR0cmlidXRlcywgZnVuY3Rpb24gKGF0KSB7XG4gICAgICAgIHJldHVybiAoL15kYXRhLVxcd1tcXHdcXC1dKiQvKS50ZXN0KGF0Lm5hbWUpO1xuICAgICAgfSk7XG4gICAgICBmb3JFYWNoLmNhbGwoaW1nRGF0YSwgZnVuY3Rpb24gKGRhdGFBdHRyKSB7XG4gICAgICAgIGlmIChkYXRhQXR0ci5uYW1lICYmIGRhdGFBdHRyLnZhbHVlKSB7XG4gICAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZShkYXRhQXR0ci5uYW1lLCBkYXRhQXR0ci52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBNYWtlIHN1cmUgYW55IGludGVybmFsbHkgcmVmZXJlbmNlZCBjbGlwUGF0aCBpZHMgYW5kIHRoZWlyXG4gICAgICAvLyBjbGlwLXBhdGggcmVmZXJlbmNlcyBhcmUgdW5pcXVlLlxuICAgICAgLy9cbiAgICAgIC8vIFRoaXMgYWRkcmVzc2VzIHRoZSBpc3N1ZSBvZiBoYXZpbmcgbXVsdGlwbGUgaW5zdGFuY2VzIG9mIHRoZVxuICAgICAgLy8gc2FtZSBTVkcgb24gYSBwYWdlIGFuZCBvbmx5IHRoZSBmaXJzdCBjbGlwUGF0aCBpZCBpcyByZWZlcmVuY2VkLlxuICAgICAgLy9cbiAgICAgIC8vIEJyb3dzZXJzIG9mdGVuIHNob3J0Y3V0IHRoZSBTVkcgU3BlYyBhbmQgZG9uJ3QgdXNlIGNsaXBQYXRoc1xuICAgICAgLy8gY29udGFpbmVkIGluIHBhcmVudCBlbGVtZW50cyB0aGF0IGFyZSBoaWRkZW4sIHNvIGlmIHlvdSBoaWRlIHRoZSBmaXJzdFxuICAgICAgLy8gU1ZHIGluc3RhbmNlIG9uIHRoZSBwYWdlLCB0aGVuIGFsbCBvdGhlciBpbnN0YW5jZXMgbG9zZSB0aGVpciBjbGlwcGluZy5cbiAgICAgIC8vIFJlZmVyZW5jZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Mzc2MDI3XG5cbiAgICAgIC8vIEhhbmRsZSBhbGwgZGVmcyBlbGVtZW50cyB0aGF0IGhhdmUgaXJpIGNhcGFibGUgYXR0cmlidXRlcyBhcyBkZWZpbmVkIGJ5IHczYzogaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHL2xpbmtpbmcuaHRtbCNwcm9jZXNzaW5nSVJJXG4gICAgICAvLyBNYXBwaW5nIElSSSBhZGRyZXNzYWJsZSBlbGVtZW50cyB0byB0aGUgcHJvcGVydGllcyB0aGF0IGNhbiByZWZlcmVuY2UgdGhlbTpcbiAgICAgIHZhciBpcmlFbGVtZW50c0FuZFByb3BlcnRpZXMgPSB7XG4gICAgICAgICdjbGlwUGF0aCc6IFsnY2xpcC1wYXRoJ10sXG4gICAgICAgICdjb2xvci1wcm9maWxlJzogWydjb2xvci1wcm9maWxlJ10sXG4gICAgICAgICdjdXJzb3InOiBbJ2N1cnNvciddLFxuICAgICAgICAnZmlsdGVyJzogWydmaWx0ZXInXSxcbiAgICAgICAgJ2xpbmVhckdyYWRpZW50JzogWydmaWxsJywgJ3N0cm9rZSddLFxuICAgICAgICAnbWFya2VyJzogWydtYXJrZXInLCAnbWFya2VyLXN0YXJ0JywgJ21hcmtlci1taWQnLCAnbWFya2VyLWVuZCddLFxuICAgICAgICAnbWFzayc6IFsnbWFzayddLFxuICAgICAgICAncGF0dGVybic6IFsnZmlsbCcsICdzdHJva2UnXSxcbiAgICAgICAgJ3JhZGlhbEdyYWRpZW50JzogWydmaWxsJywgJ3N0cm9rZSddXG4gICAgICB9O1xuXG4gICAgICB2YXIgZWxlbWVudCwgZWxlbWVudERlZnMsIHByb3BlcnRpZXMsIGN1cnJlbnRJZCwgbmV3SWQ7XG4gICAgICBPYmplY3Qua2V5cyhpcmlFbGVtZW50c0FuZFByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBlbGVtZW50ID0ga2V5O1xuICAgICAgICBwcm9wZXJ0aWVzID0gaXJpRWxlbWVudHNBbmRQcm9wZXJ0aWVzW2tleV07XG5cbiAgICAgICAgZWxlbWVudERlZnMgPSBzdmcucXVlcnlTZWxlY3RvckFsbCgnZGVmcyAnICsgZWxlbWVudCArICdbaWRdJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBlbGVtZW50c0xlbiA9IGVsZW1lbnREZWZzLmxlbmd0aDsgaSA8IGVsZW1lbnRzTGVuOyBpKyspIHtcbiAgICAgICAgICBjdXJyZW50SWQgPSBlbGVtZW50RGVmc1tpXS5pZDtcbiAgICAgICAgICBuZXdJZCA9IGN1cnJlbnRJZCArICctJyArIGluamVjdENvdW50O1xuXG4gICAgICAgICAgLy8gQWxsIG9mIHRoZSBwcm9wZXJ0aWVzIHRoYXQgY2FuIHJlZmVyZW5jZSB0aGlzIGVsZW1lbnQgdHlwZVxuICAgICAgICAgIHZhciByZWZlcmVuY2luZ0VsZW1lbnRzO1xuICAgICAgICAgIGZvckVhY2guY2FsbChwcm9wZXJ0aWVzLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgIC8vIDpOT1RFOiB1c2luZyBhIHN1YnN0cmluZyBtYXRjaCBhdHRyIHNlbGVjdG9yIGhlcmUgdG8gZGVhbCB3aXRoIElFIFwiYWRkaW5nIGV4dHJhIHF1b3RlcyBpbiB1cmwoKSBhdHRyc1wiXG4gICAgICAgICAgICByZWZlcmVuY2luZ0VsZW1lbnRzID0gc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJ1snICsgcHJvcGVydHkgKyAnKj1cIicgKyBjdXJyZW50SWQgKyAnXCJdJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgcmVmZXJlbmNpbmdFbGVtZW50TGVuID0gcmVmZXJlbmNpbmdFbGVtZW50cy5sZW5ndGg7IGogPCByZWZlcmVuY2luZ0VsZW1lbnRMZW47IGorKykge1xuICAgICAgICAgICAgICByZWZlcmVuY2luZ0VsZW1lbnRzW2pdLnNldEF0dHJpYnV0ZShwcm9wZXJ0eSwgJ3VybCgjJyArIG5ld0lkICsgJyknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGVsZW1lbnREZWZzW2ldLmlkID0gbmV3SWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBSZW1vdmUgYW55IHVud2FudGVkL2ludmFsaWQgbmFtZXNwYWNlcyB0aGF0IG1pZ2h0IGhhdmUgYmVlbiBhZGRlZCBieSBTVkcgZWRpdGluZyB0b29sc1xuICAgICAgc3ZnLnJlbW92ZUF0dHJpYnV0ZSgneG1sbnM6YScpO1xuXG4gICAgICAvLyBQb3N0IHBhZ2UgbG9hZCBpbmplY3RlZCBTVkdzIGRvbid0IGF1dG9tYXRpY2FsbHkgaGF2ZSB0aGVpciBzY3JpcHRcbiAgICAgIC8vIGVsZW1lbnRzIHJ1biwgc28gd2UnbGwgbmVlZCB0byBtYWtlIHRoYXQgaGFwcGVuLCBpZiByZXF1ZXN0ZWRcblxuICAgICAgLy8gRmluZCB0aGVuIHBydW5lIHRoZSBzY3JpcHRzXG4gICAgICB2YXIgc2NyaXB0cyA9IHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQnKTtcbiAgICAgIHZhciBzY3JpcHRzVG9FdmFsID0gW107XG4gICAgICB2YXIgc2NyaXB0LCBzY3JpcHRUeXBlO1xuXG4gICAgICBmb3IgKHZhciBrID0gMCwgc2NyaXB0c0xlbiA9IHNjcmlwdHMubGVuZ3RoOyBrIDwgc2NyaXB0c0xlbjsgaysrKSB7XG4gICAgICAgIHNjcmlwdFR5cGUgPSBzY3JpcHRzW2tdLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyBqYXZhc2NyaXB0IHR5cGVzLlxuICAgICAgICAvLyBTVkcgZGVmYXVsdHMgdG8gJ2FwcGxpY2F0aW9uL2VjbWFzY3JpcHQnIGZvciB1bnNldCB0eXBlc1xuICAgICAgICBpZiAoIXNjcmlwdFR5cGUgfHwgc2NyaXB0VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL2VjbWFzY3JpcHQnIHx8IHNjcmlwdFR5cGUgPT09ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0Jykge1xuXG4gICAgICAgICAgLy8gaW5uZXJUZXh0IGZvciBJRSwgdGV4dENvbnRlbnQgZm9yIG90aGVyIGJyb3dzZXJzXG4gICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1trXS5pbm5lclRleHQgfHwgc2NyaXB0c1trXS50ZXh0Q29udGVudDtcblxuICAgICAgICAgIC8vIFN0YXNoXG4gICAgICAgICAgc2NyaXB0c1RvRXZhbC5wdXNoKHNjcmlwdCk7XG5cbiAgICAgICAgICAvLyBUaWR5IHVwIGFuZCByZW1vdmUgdGhlIHNjcmlwdCBlbGVtZW50IHNpbmNlIHdlIGRvbid0IG5lZWQgaXQgYW55bW9yZVxuICAgICAgICAgIHN2Zy5yZW1vdmVDaGlsZChzY3JpcHRzW2tdKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSdW4vRXZhbCB0aGUgc2NyaXB0cyBpZiBuZWVkZWRcbiAgICAgIGlmIChzY3JpcHRzVG9FdmFsLmxlbmd0aCA+IDAgJiYgKGV2YWxTY3JpcHRzID09PSAnYWx3YXlzJyB8fCAoZXZhbFNjcmlwdHMgPT09ICdvbmNlJyAmJiAhcmFuU2NyaXB0c1tpbWdVcmxdKSkpIHtcbiAgICAgICAgZm9yICh2YXIgbCA9IDAsIHNjcmlwdHNUb0V2YWxMZW4gPSBzY3JpcHRzVG9FdmFsLmxlbmd0aDsgbCA8IHNjcmlwdHNUb0V2YWxMZW47IGwrKykge1xuXG4gICAgICAgICAgLy8gOk5PVEU6IFl1cCwgdGhpcyBpcyBhIGZvcm0gb2YgZXZhbCwgYnV0IGl0IGlzIGJlaW5nIHVzZWQgdG8gZXZhbCBjb2RlXG4gICAgICAgICAgLy8gdGhlIGNhbGxlciBoYXMgZXhwbGljdGVseSBhc2tlZCB0byBiZSBsb2FkZWQsIGFuZCB0aGUgY29kZSBpcyBpbiBhIGNhbGxlclxuICAgICAgICAgIC8vIGRlZmluZWQgU1ZHIGZpbGUuLi4gbm90IHJhdyB1c2VyIGlucHV0LlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gQWxzbywgdGhlIGNvZGUgaXMgZXZhbHVhdGVkIGluIGEgY2xvc3VyZSBhbmQgbm90IGluIHRoZSBnbG9iYWwgc2NvcGUuXG4gICAgICAgICAgLy8gSWYgeW91IG5lZWQgdG8gcHV0IHNvbWV0aGluZyBpbiBnbG9iYWwgc2NvcGUsIHVzZSAnd2luZG93J1xuICAgICAgICAgIG5ldyBGdW5jdGlvbihzY3JpcHRzVG9FdmFsW2xdKSh3aW5kb3cpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbWVtYmVyIHdlIGFscmVhZHkgcmFuIHNjcmlwdHMgZm9yIHRoaXMgc3ZnXG4gICAgICAgIHJhblNjcmlwdHNbaW1nVXJsXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIDpXT1JLQVJPVU5EOlxuICAgICAgLy8gSUUgZG9lc24ndCBldmFsdWF0ZSA8c3R5bGU+IHRhZ3MgaW4gU1ZHcyB0aGF0IGFyZSBkeW5hbWljYWxseSBhZGRlZCB0byB0aGUgcGFnZS5cbiAgICAgIC8vIFRoaXMgdHJpY2sgd2lsbCB0cmlnZ2VyIElFIHRvIHJlYWQgYW5kIHVzZSBhbnkgZXhpc3RpbmcgU1ZHIDxzdHlsZT4gdGFncy5cbiAgICAgIC8vXG4gICAgICAvLyBSZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9pY29uaWMvU1ZHSW5qZWN0b3IvaXNzdWVzLzIzXG4gICAgICB2YXIgc3R5bGVUYWdzID0gc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJ3N0eWxlJyk7XG4gICAgICBmb3JFYWNoLmNhbGwoc3R5bGVUYWdzLCBmdW5jdGlvbiAoc3R5bGVUYWcpIHtcbiAgICAgICAgc3R5bGVUYWcudGV4dENvbnRlbnQgKz0gJyc7XG4gICAgICB9KTtcblxuICAgICAgLy8gUmVwbGFjZSB0aGUgaW1hZ2Ugd2l0aCB0aGUgc3ZnXG4gICAgICBlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChzdmcsIGVsKTtcblxuICAgICAgLy8gTm93IHRoYXQgd2Ugbm8gbG9uZ2VyIG5lZWQgaXQsIGRyb3AgcmVmZXJlbmNlc1xuICAgICAgLy8gdG8gdGhlIG9yaWdpbmFsIGVsZW1lbnQgc28gaXQgY2FuIGJlIEdDJ2RcbiAgICAgIGRlbGV0ZSBpbmplY3RlZEVsZW1lbnRzW2luamVjdGVkRWxlbWVudHMuaW5kZXhPZihlbCldO1xuICAgICAgZWwgPSBudWxsO1xuXG4gICAgICAvLyBJbmNyZW1lbnQgdGhlIGluamVjdGVkIGNvdW50XG4gICAgICBpbmplY3RDb3VudCsrO1xuXG4gICAgICBjYWxsYmFjayhzdmcpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTVkdJbmplY3RvclxuICAgKlxuICAgKiBSZXBsYWNlIHRoZSBnaXZlbiBlbGVtZW50cyB3aXRoIHRoZWlyIGZ1bGwgaW5saW5lIFNWRyBET00gZWxlbWVudHMuXG4gICAqXG4gICAqIDpOT1RFOiBXZSBhcmUgdXNpbmcgZ2V0L3NldEF0dHJpYnV0ZSB3aXRoIFNWRyBiZWNhdXNlIHRoZSBTVkcgRE9NIHNwZWMgZGlmZmVycyBmcm9tIEhUTUwgRE9NIGFuZFxuICAgKiBjYW4gcmV0dXJuIG90aGVyIHVuZXhwZWN0ZWQgb2JqZWN0IHR5cGVzIHdoZW4gdHJ5aW5nIHRvIGRpcmVjdGx5IGFjY2VzcyBzdmcgcHJvcGVydGllcy5cbiAgICogZXg6IFwiY2xhc3NOYW1lXCIgcmV0dXJucyBhIFNWR0FuaW1hdGVkU3RyaW5nIHdpdGggdGhlIGNsYXNzIHZhbHVlIGZvdW5kIGluIHRoZSBcImJhc2VWYWxcIiBwcm9wZXJ0eSxcbiAgICogaW5zdGVhZCBvZiBzaW1wbGUgc3RyaW5nIGxpa2Ugd2l0aCBIVE1MIEVsZW1lbnRzLlxuICAgKlxuICAgKiBAcGFyYW0ge21peGVzfSBBcnJheSBvZiBvciBzaW5nbGUgRE9NIGVsZW1lbnRcbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybiB7b2JqZWN0fSBJbnN0YW5jZSBvZiBTVkdJbmplY3RvclxuICAgKi9cbiAgdmFyIFNWR0luamVjdG9yID0gZnVuY3Rpb24gKGVsZW1lbnRzLCBvcHRpb25zLCBkb25lKSB7XG5cbiAgICAvLyBPcHRpb25zICYgZGVmYXVsdHNcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIFNob3VsZCB3ZSBydW4gdGhlIHNjcmlwdHMgYmxvY2tzIGZvdW5kIGluIHRoZSBTVkdcbiAgICAvLyAnYWx3YXlzJyAtIFJ1biB0aGVtIGV2ZXJ5IHRpbWVcbiAgICAvLyAnb25jZScgLSBPbmx5IHJ1biBzY3JpcHRzIG9uY2UgZm9yIGVhY2ggU1ZHXG4gICAgLy8gW2ZhbHNlfCduZXZlciddIC0gSWdub3JlIHNjcmlwdHNcbiAgICB2YXIgZXZhbFNjcmlwdHMgPSBvcHRpb25zLmV2YWxTY3JpcHRzIHx8ICdhbHdheXMnO1xuXG4gICAgLy8gTG9jYXRpb24gb2YgZmFsbGJhY2sgcG5ncywgaWYgZGVzaXJlZFxuICAgIHZhciBwbmdGYWxsYmFjayA9IG9wdGlvbnMucG5nRmFsbGJhY2sgfHwgZmFsc2U7XG5cbiAgICAvLyBDYWxsYmFjayB0byBydW4gZHVyaW5nIGVhY2ggU1ZHIGluamVjdGlvbiwgcmV0dXJuaW5nIHRoZSBTVkcgaW5qZWN0ZWRcbiAgICB2YXIgZWFjaENhbGxiYWNrID0gb3B0aW9ucy5lYWNoO1xuXG4gICAgLy8gRG8gdGhlIGluamVjdGlvbi4uLlxuICAgIGlmIChlbGVtZW50cy5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIGVsZW1lbnRzTG9hZGVkID0gMDtcbiAgICAgIGZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaW5qZWN0RWxlbWVudChlbGVtZW50LCBldmFsU2NyaXB0cywgcG5nRmFsbGJhY2ssIGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgICBpZiAoZWFjaENhbGxiYWNrICYmIHR5cGVvZiBlYWNoQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIGVhY2hDYWxsYmFjayhzdmcpO1xuICAgICAgICAgIGlmIChkb25lICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gKytlbGVtZW50c0xvYWRlZCkgZG9uZShlbGVtZW50c0xvYWRlZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKGVsZW1lbnRzKSB7XG4gICAgICAgIGluamVjdEVsZW1lbnQoZWxlbWVudHMsIGV2YWxTY3JpcHRzLCBwbmdGYWxsYmFjaywgZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICAgIGlmIChlYWNoQ2FsbGJhY2sgJiYgdHlwZW9mIGVhY2hDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykgZWFjaENhbGxiYWNrKHN2Zyk7XG4gICAgICAgICAgaWYgKGRvbmUpIGRvbmUoMSk7XG4gICAgICAgICAgZWxlbWVudHMgPSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBpZiAoZG9uZSkgZG9uZSgwKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyogZ2xvYmFsIG1vZHVsZSwgZXhwb3J0czogdHJ1ZSwgZGVmaW5lICovXG4gIC8vIE5vZGUuanMgb3IgQ29tbW9uSlNcbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBTVkdJbmplY3RvcjtcbiAgfVxuICAvLyBBTUQgc3VwcG9ydFxuICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFNWR0luamVjdG9yO1xuICAgIH0pO1xuICB9XG4gIC8vIE90aGVyd2lzZSwgYXR0YWNoIHRvIHdpbmRvdyBhcyBnbG9iYWxcbiAgZWxzZSBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHtcbiAgICB3aW5kb3cuU1ZHSW5qZWN0b3IgPSBTVkdJbmplY3RvcjtcbiAgfVxuICAvKiBnbG9iYWwgLW1vZHVsZSwgLWV4cG9ydHMsIC1kZWZpbmUgKi9cblxufSh3aW5kb3csIGRvY3VtZW50KSk7XG4iLCJ2YXIgYXV0b1Njcm9sbCA9IChmdW5jdGlvbiAoKSB7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGdldERlZihmLCBkKSB7XG4gICAgaWYgKHR5cGVvZiBmID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGQgPT09ICd1bmRlZmluZWQnID8gZiA6IGQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGY7XG59XG5mdW5jdGlvbiBib29sZWFuKGZ1bmMsIGRlZikge1xuXG4gICAgZnVuYyA9IGdldERlZihmdW5jLCBkZWYpO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBmKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3VtZW50cyQxID0gYXJndW1lbnRzO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICAgICAgICAgIGFyZ3NbX2tleV0gPSBhcmd1bWVudHMkMVtfa2V5XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuICEhZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gISFmdW5jID8gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbn1cblxudmFyIHByZWZpeCA9IFsnd2Via2l0JywgJ21veicsICdtcycsICdvJ107XG5cbnZhciByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxpbWl0ID0gcHJlZml4Lmxlbmd0aDsgaSA8IGxpbWl0ICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ByZWZpeFtpXSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgfVxuXG4gIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbGFzdFRpbWUgPSAwO1xuXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgdmFyIHR0YyA9IE1hdGgubWF4KDAsIDE2IC0gbm93IC0gbGFzdFRpbWUpO1xuICAgICAgICB2YXIgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5vdyArIHR0Yyk7XG4gICAgICAgIH0sIHR0Yyk7XG5cbiAgICAgICAgbGFzdFRpbWUgPSBub3cgKyB0dGM7XG5cbiAgICAgICAgcmV0dXJuIHRpbWVyO1xuICAgICAgfTtcbiAgICB9KSgpO1xuICB9XG5cbiAgcmV0dXJuIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZCh3aW5kb3cpO1xufSgpO1xuXG52YXIgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxpbWl0ID0gcHJlZml4Lmxlbmd0aDsgaSA8IGxpbWl0ICYmICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvd1twcmVmaXhbaV0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCB3aW5kb3dbcHJlZml4W2ldICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9XG5cbiAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbiAodGltZXIpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KTtcbn0oKTtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8qKlxuICogUmV0dXJucyBgdHJ1ZWAgaWYgcHJvdmlkZWQgaW5wdXQgaXMgRWxlbWVudC5cbiAqIEBuYW1lIGlzRWxlbWVudFxuICogQHBhcmFtIHsqfSBbaW5wdXRdXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xudmFyIGlzRWxlbWVudCA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICByZXR1cm4gaW5wdXQgIT0gbnVsbCAmJiAodHlwZW9mIGlucHV0ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihpbnB1dCkpID09PSAnb2JqZWN0JyAmJiBpbnB1dC5ub2RlVHlwZSA9PT0gMSAmJiBfdHlwZW9mKGlucHV0LnN0eWxlKSA9PT0gJ29iamVjdCcgJiYgX3R5cGVvZihpbnB1dC5vd25lckRvY3VtZW50KSA9PT0gJ29iamVjdCc7XG59O1xuXG4vLyBQcm9kdWN0aW9uIHN0ZXBzIG9mIEVDTUEtMjYyLCBFZGl0aW9uIDYsIDIyLjEuMi4xXG4vLyBSZWZlcmVuY2U6IGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1hcnJheS5mcm9tXG5cbi8qKlxuICogaXNBcnJheVxuICovXG5cbmZ1bmN0aW9uIGluZGV4T2ZFbGVtZW50KGVsZW1lbnRzLCBlbGVtZW50KSB7XG4gICAgZWxlbWVudCA9IHJlc29sdmVFbGVtZW50KGVsZW1lbnQsIHRydWUpO1xuICAgIGlmICghaXNFbGVtZW50KGVsZW1lbnQpKSB7IHJldHVybiAtMTsgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVsZW1lbnRzW2ldID09PSBlbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGhhc0VsZW1lbnQoZWxlbWVudHMsIGVsZW1lbnQpIHtcbiAgICByZXR1cm4gLTEgIT09IGluZGV4T2ZFbGVtZW50KGVsZW1lbnRzLCBlbGVtZW50KTtcbn1cblxuZnVuY3Rpb24gcHVzaEVsZW1lbnRzKGVsZW1lbnRzLCB0b0FkZCkge1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b0FkZC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIWhhc0VsZW1lbnQoZWxlbWVudHMsIHRvQWRkW2ldKSkgeyBlbGVtZW50cy5wdXNoKHRvQWRkW2ldKTsgfVxuICAgIH1cblxuICAgIHJldHVybiB0b0FkZDtcbn1cblxuZnVuY3Rpb24gYWRkRWxlbWVudHMoZWxlbWVudHMpIHtcbiAgICB2YXIgYXJndW1lbnRzJDEgPSBhcmd1bWVudHM7XG5cbiAgICBmb3IgKHZhciBfbGVuMiA9IGFyZ3VtZW50cy5sZW5ndGgsIHRvQWRkID0gQXJyYXkoX2xlbjIgPiAxID8gX2xlbjIgLSAxIDogMCksIF9rZXkyID0gMTsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgICAgICB0b0FkZFtfa2V5MiAtIDFdID0gYXJndW1lbnRzJDFbX2tleTJdO1xuICAgIH1cblxuICAgIHRvQWRkID0gdG9BZGQubWFwKHJlc29sdmVFbGVtZW50KTtcbiAgICByZXR1cm4gcHVzaEVsZW1lbnRzKGVsZW1lbnRzLCB0b0FkZCk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnRzKGVsZW1lbnRzKSB7XG4gICAgdmFyIGFyZ3VtZW50cyQxID0gYXJndW1lbnRzO1xuXG4gICAgZm9yICh2YXIgX2xlbjMgPSBhcmd1bWVudHMubGVuZ3RoLCB0b1JlbW92ZSA9IEFycmF5KF9sZW4zID4gMSA/IF9sZW4zIC0gMSA6IDApLCBfa2V5MyA9IDE7IF9rZXkzIDwgX2xlbjM7IF9rZXkzKyspIHtcbiAgICAgICAgdG9SZW1vdmVbX2tleTMgLSAxXSA9IGFyZ3VtZW50cyQxW19rZXkzXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdG9SZW1vdmUubWFwKHJlc29sdmVFbGVtZW50KS5yZWR1Y2UoZnVuY3Rpb24gKGxhc3QsIGUpIHtcblxuICAgICAgICB2YXIgaW5kZXgkJDEgPSBpbmRleE9mRWxlbWVudChlbGVtZW50cywgZSk7XG5cbiAgICAgICAgaWYgKGluZGV4JCQxICE9PSAtMSkgeyByZXR1cm4gbGFzdC5jb25jYXQoZWxlbWVudHMuc3BsaWNlKGluZGV4JCQxLCAxKSk7IH1cbiAgICAgICAgcmV0dXJuIGxhc3Q7XG4gICAgfSwgW10pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRWxlbWVudChlbGVtZW50LCBub1Rocm93KSB7XG4gICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWlzRWxlbWVudChlbGVtZW50KSAmJiAhbm9UaHJvdykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGVsZW1lbnQgKyAnIGlzIG5vdCBhIERPTSBlbGVtZW50LicpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbn1cblxudmFyIGluZGV4JDIgPSBmdW5jdGlvbiBjcmVhdGVQb2ludENCKG9iamVjdCwgb3B0aW9ucyl7XG5cbiAgICAvLyBBIHBlcnNpc3RlbnQgb2JqZWN0IChhcyBvcHBvc2VkIHRvIHJldHVybmVkIG9iamVjdCkgaXMgdXNlZCB0byBzYXZlIG1lbW9yeVxuICAgIC8vIFRoaXMgaXMgZ29vZCB0byBwcmV2ZW50IGxheW91dCB0aHJhc2hpbmcsIG9yIGZvciBnYW1lcywgYW5kIHN1Y2hcblxuICAgIC8vIE5PVEVcbiAgICAvLyBUaGlzIHVzZXMgSUUgZml4ZXMgd2hpY2ggc2hvdWxkIGJlIE9LIHRvIHJlbW92ZSBzb21lIGRheS4gOilcbiAgICAvLyBTb21lIHNwZWVkIHdpbGwgYmUgZ2FpbmVkIGJ5IHJlbW92YWwgb2YgdGhlc2UuXG5cbiAgICAvLyBwb2ludENCIHNob3VsZCBiZSBzYXZlZCBpbiBhIHZhcmlhYmxlIG9uIHJldHVyblxuICAgIC8vIFRoaXMgYWxsb3dzIHRoZSB1c2FnZSBvZiBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXJcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdmFyIGFsbG93VXBkYXRlO1xuXG4gICAgaWYodHlwZW9mIG9wdGlvbnMuYWxsb3dVcGRhdGUgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICBhbGxvd1VwZGF0ZSA9IG9wdGlvbnMuYWxsb3dVcGRhdGU7XG4gICAgfWVsc2V7XG4gICAgICAgIGFsbG93VXBkYXRlID0gZnVuY3Rpb24oKXtyZXR1cm4gdHJ1ZTt9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBwb2ludENCKGV2ZW50KXtcblxuICAgICAgICBldmVudCA9IGV2ZW50IHx8IHdpbmRvdy5ldmVudDsgLy8gSUUtaXNtXG4gICAgICAgIG9iamVjdC50YXJnZXQgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudCB8fCBldmVudC5vcmlnaW5hbFRhcmdldDtcbiAgICAgICAgb2JqZWN0LmVsZW1lbnQgPSB0aGlzO1xuICAgICAgICBvYmplY3QudHlwZSA9IGV2ZW50LnR5cGU7XG5cbiAgICAgICAgaWYoIWFsbG93VXBkYXRlKGV2ZW50KSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdXBwb3J0IHRvdWNoXG4gICAgICAgIC8vIGh0dHA6Ly93d3cuY3JlYXRpdmVibG9xLmNvbS9qYXZhc2NyaXB0L21ha2UteW91ci1zaXRlLXdvcmstdG91Y2gtZGV2aWNlcy01MTQxMTY0NFxuXG4gICAgICAgIGlmKGV2ZW50LnRhcmdldFRvdWNoZXMpe1xuICAgICAgICAgICAgb2JqZWN0LnggPSBldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFg7XG4gICAgICAgICAgICBvYmplY3QueSA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgICAgIG9iamVjdC5wYWdlWCA9IGV2ZW50LnBhZ2VYO1xuICAgICAgICAgICAgb2JqZWN0LnBhZ2VZID0gZXZlbnQucGFnZVk7XG4gICAgICAgIH1lbHNle1xuXG4gICAgICAgICAgICAvLyBJZiBwYWdlWC9ZIGFyZW4ndCBhdmFpbGFibGUgYW5kIGNsaWVudFgvWSBhcmUsXG4gICAgICAgICAgICAvLyBjYWxjdWxhdGUgcGFnZVgvWSAtIGxvZ2ljIHRha2VuIGZyb20galF1ZXJ5LlxuICAgICAgICAgICAgLy8gKFRoaXMgaXMgdG8gc3VwcG9ydCBvbGQgSUUpXG4gICAgICAgICAgICAvLyBOT1RFIEhvcGVmdWxseSB0aGlzIGNhbiBiZSByZW1vdmVkIHNvb24uXG5cbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWCA9PT0gbnVsbCAmJiBldmVudC5jbGllbnRYICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50RG9jID0gKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXQub3duZXJEb2N1bWVudCkgfHwgZG9jdW1lbnQ7XG4gICAgICAgICAgICAgICAgdmFyIGRvYyA9IGV2ZW50RG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IGV2ZW50RG9jLmJvZHk7XG5cbiAgICAgICAgICAgICAgICBvYmplY3QucGFnZVggPSBldmVudC5jbGllbnRYICtcbiAgICAgICAgICAgICAgICAgIChkb2MgJiYgZG9jLnNjcm9sbExlZnQgfHwgYm9keSAmJiBib2R5LnNjcm9sbExlZnQgfHwgMCkgLVxuICAgICAgICAgICAgICAgICAgKGRvYyAmJiBkb2MuY2xpZW50TGVmdCB8fCBib2R5ICYmIGJvZHkuY2xpZW50TGVmdCB8fCAwKTtcbiAgICAgICAgICAgICAgICBvYmplY3QucGFnZVkgPSBldmVudC5jbGllbnRZICtcbiAgICAgICAgICAgICAgICAgIChkb2MgJiYgZG9jLnNjcm9sbFRvcCAgfHwgYm9keSAmJiBib2R5LnNjcm9sbFRvcCAgfHwgMCkgLVxuICAgICAgICAgICAgICAgICAgKGRvYyAmJiBkb2MuY2xpZW50VG9wICB8fCBib2R5ICYmIGJvZHkuY2xpZW50VG9wICB8fCAwICk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBvYmplY3QucGFnZVggPSBldmVudC5wYWdlWDtcbiAgICAgICAgICAgICAgICBvYmplY3QucGFnZVkgPSBldmVudC5wYWdlWTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFnZVgsIGFuZCBwYWdlWSBjaGFuZ2Ugd2l0aCBwYWdlIHNjcm9sbFxuICAgICAgICAgICAgLy8gc28gd2UncmUgbm90IGdvaW5nIHRvIHVzZSB0aG9zZSBmb3IgeCwgYW5kIHkuXG4gICAgICAgICAgICAvLyBOT1RFIE1vc3QgYnJvd3NlcnMgYWxzbyBhbGlhcyBjbGllbnRYL1kgd2l0aCB4L3lcbiAgICAgICAgICAgIC8vIHNvIHRoYXQncyBzb21ldGhpbmcgdG8gY29uc2lkZXIgZG93biB0aGUgcm9hZC5cblxuICAgICAgICAgICAgb2JqZWN0LnggPSBldmVudC5jbGllbnRYO1xuICAgICAgICAgICAgb2JqZWN0LnkgPSBldmVudC5jbGllbnRZO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgLy9OT1RFIFJlbWVtYmVyIGFjY2Vzc2liaWxpdHksIEFyaWEgcm9sZXMsIGFuZCBsYWJlbHMuXG59O1xuXG5mdW5jdGlvbiBjcmVhdGVXaW5kb3dSZWN0KCkge1xuICAgIHZhciBwcm9wcyA9IHtcbiAgICAgICAgdG9wOiB7IHZhbHVlOiAwLCBlbnVtZXJhYmxlOiB0cnVlIH0sXG4gICAgICAgIGxlZnQ6IHsgdmFsdWU6IDAsIGVudW1lcmFibGU6IHRydWUgfSxcbiAgICAgICAgcmlnaHQ6IHsgdmFsdWU6IHdpbmRvdy5pbm5lcldpZHRoLCBlbnVtZXJhYmxlOiB0cnVlIH0sXG4gICAgICAgIGJvdHRvbTogeyB2YWx1ZTogd2luZG93LmlubmVySGVpZ2h0LCBlbnVtZXJhYmxlOiB0cnVlIH0sXG4gICAgICAgIHdpZHRoOiB7IHZhbHVlOiB3aW5kb3cuaW5uZXJXaWR0aCwgZW51bWVyYWJsZTogdHJ1ZSB9LFxuICAgICAgICBoZWlnaHQ6IHsgdmFsdWU6IHdpbmRvdy5pbm5lckhlaWdodCwgZW51bWVyYWJsZTogdHJ1ZSB9LFxuICAgICAgICB4OiB7IHZhbHVlOiAwLCBlbnVtZXJhYmxlOiB0cnVlIH0sXG4gICAgICAgIHk6IHsgdmFsdWU6IDAsIGVudW1lcmFibGU6IHRydWUgfVxuICAgIH07XG5cbiAgICBpZiAoT2JqZWN0LmNyZWF0ZSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZSh7fSwgcHJvcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZWN0ID0ge307XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHJlY3QsIHByb3BzKTtcbiAgICAgICAgcmV0dXJuIHJlY3Q7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0KGVsKSB7XG4gICAgaWYgKGVsID09PSB3aW5kb3cpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVdpbmRvd1JlY3QoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGlmIChyZWN0LnggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlY3QueCA9IHJlY3QubGVmdDtcbiAgICAgICAgICAgICAgICByZWN0LnkgPSByZWN0LnRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZWN0O1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2FuJ3QgY2FsbCBnZXRCb3VuZGluZ0NsaWVudFJlY3Qgb24gXCIgKyBlbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBvaW50SW5zaWRlKHBvaW50LCBlbCkge1xuICAgIHZhciByZWN0ID0gZ2V0Q2xpZW50UmVjdChlbCk7XG4gICAgcmV0dXJuIHBvaW50LnkgPiByZWN0LnRvcCAmJiBwb2ludC55IDwgcmVjdC5ib3R0b20gJiYgcG9pbnQueCA+IHJlY3QubGVmdCAmJiBwb2ludC54IDwgcmVjdC5yaWdodDtcbn1cblxudmFyIG9iamVjdENyZWF0ZSA9IHZvaWQgMDtcbmlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSAhPSAnZnVuY3Rpb24nKSB7XG4gIG9iamVjdENyZWF0ZSA9IGZ1bmN0aW9uICh1bmRlZmluZWQpIHtcbiAgICB2YXIgVGVtcCA9IGZ1bmN0aW9uIFRlbXAoKSB7fTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHByb3RvdHlwZSwgcHJvcGVydGllc09iamVjdCkge1xuICAgICAgaWYgKHByb3RvdHlwZSAhPT0gT2JqZWN0KHByb3RvdHlwZSkgJiYgcHJvdG90eXBlICE9PSBudWxsKSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QsIG9yIG51bGwnKTtcbiAgICAgIH1cbiAgICAgIFRlbXAucHJvdG90eXBlID0gcHJvdG90eXBlIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IG5ldyBUZW1wKCk7XG4gICAgICBUZW1wLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICBpZiAocHJvcGVydGllc09iamVjdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHJlc3VsdCwgcHJvcGVydGllc09iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRvIGltaXRhdGUgdGhlIGNhc2Ugb2YgT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgaWYgKHByb3RvdHlwZSA9PT0gbnVsbCkge1xuICAgICAgICByZXN1bHQuX19wcm90b19fID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSgpO1xufSBlbHNlIHtcbiAgb2JqZWN0Q3JlYXRlID0gT2JqZWN0LmNyZWF0ZTtcbn1cblxudmFyIG9iamVjdENyZWF0ZSQxID0gb2JqZWN0Q3JlYXRlO1xuXG52YXIgbW91c2VFdmVudFByb3BzID0gWydhbHRLZXknLCAnYnV0dG9uJywgJ2J1dHRvbnMnLCAnY2xpZW50WCcsICdjbGllbnRZJywgJ2N0cmxLZXknLCAnbWV0YUtleScsICdtb3ZlbWVudFgnLCAnbW92ZW1lbnRZJywgJ29mZnNldFgnLCAnb2Zmc2V0WScsICdwYWdlWCcsICdwYWdlWScsICdyZWdpb24nLCAncmVsYXRlZFRhcmdldCcsICdzY3JlZW5YJywgJ3NjcmVlblknLCAnc2hpZnRLZXknLCAnd2hpY2gnLCAneCcsICd5J107XG5cbmZ1bmN0aW9uIGNyZWF0ZURpc3BhdGNoZXIoZWxlbWVudCkge1xuXG4gICAgdmFyIGRlZmF1bHRTZXR0aW5ncyA9IHtcbiAgICAgICAgc2NyZWVuWDogMCxcbiAgICAgICAgc2NyZWVuWTogMCxcbiAgICAgICAgY2xpZW50WDogMCxcbiAgICAgICAgY2xpZW50WTogMCxcbiAgICAgICAgY3RybEtleTogZmFsc2UsXG4gICAgICAgIHNoaWZ0S2V5OiBmYWxzZSxcbiAgICAgICAgYWx0S2V5OiBmYWxzZSxcbiAgICAgICAgbWV0YUtleTogZmFsc2UsXG4gICAgICAgIGJ1dHRvbjogMCxcbiAgICAgICAgYnV0dG9uczogMSxcbiAgICAgICAgcmVsYXRlZFRhcmdldDogbnVsbCxcbiAgICAgICAgcmVnaW9uOiBudWxsXG4gICAgfTtcblxuICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTW92ZShlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbW91c2VFdmVudFByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWZhdWx0U2V0dGluZ3NbbW91c2VFdmVudFByb3BzW2ldXSA9IGVbbW91c2VFdmVudFByb3BzW2ldXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBkaXNwYXRjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKE1vdXNlRXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiBtMShlbGVtZW50LCBpbml0TW92ZSwgZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBldnQgPSBuZXcgTW91c2VFdmVudCgnbW91c2Vtb3ZlJywgY3JlYXRlTW92ZUluaXQoZGVmYXVsdFNldHRpbmdzLCBpbml0TW92ZSkpO1xuXG4gICAgICAgICAgICAgICAgLy9ldnQuZGlzcGF0Y2hlZCA9ICdtb3VzZW1vdmUnO1xuICAgICAgICAgICAgICAgIHNldFNwZWNpYWwoZXZ0LCBkYXRhKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gbTIoZWxlbWVudCwgaW5pdE1vdmUsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2V0dGluZ3MgPSBjcmVhdGVNb3ZlSW5pdChkZWZhdWx0U2V0dGluZ3MsIGluaXRNb3ZlKTtcbiAgICAgICAgICAgICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnRzJyk7XG5cbiAgICAgICAgICAgICAgICBldnQuaW5pdE1vdXNlRXZlbnQoXCJtb3VzZW1vdmVcIiwgdHJ1ZSwgLy9jYW4gYnViYmxlXG4gICAgICAgICAgICAgICAgdHJ1ZSwgLy9jYW5jZWxhYmxlXG4gICAgICAgICAgICAgICAgd2luZG93LCAvL3ZpZXdcbiAgICAgICAgICAgICAgICAwLCAvL2RldGFpbFxuICAgICAgICAgICAgICAgIHNldHRpbmdzLnNjcmVlblgsIC8vMCwgLy9zY3JlZW5YXG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc2NyZWVuWSwgLy8wLCAvL3NjcmVlbllcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5jbGllbnRYLCAvLzgwLCAvL2NsaWVudFhcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5jbGllbnRZLCAvLzIwLCAvL2NsaWVudFlcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5jdHJsS2V5LCAvL2ZhbHNlLCAvL2N0cmxLZXlcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hbHRLZXksIC8vZmFsc2UsIC8vYWx0S2V5XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc2hpZnRLZXksIC8vZmFsc2UsIC8vc2hpZnRLZXlcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5tZXRhS2V5LCAvL2ZhbHNlLCAvL21ldGFLZXlcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5idXR0b24sIC8vMCwgLy9idXR0b25cbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5yZWxhdGVkVGFyZ2V0IC8vbnVsbCAvL3JlbGF0ZWRUYXJnZXRcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy9ldnQuZGlzcGF0Y2hlZCA9ICdtb3VzZW1vdmUnO1xuICAgICAgICAgICAgICAgIHNldFNwZWNpYWwoZXZ0LCBkYXRhKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gbTMoZWxlbWVudCwgaW5pdE1vdmUsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICAgICAgICAgICAgICB2YXIgc2V0dGluZ3MgPSBjcmVhdGVNb3ZlSW5pdChkZWZhdWx0U2V0dGluZ3MsIGluaXRNb3ZlKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuYW1lIGluIHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2dFtuYW1lXSA9IHNldHRpbmdzW25hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vZXZ0LmRpc3BhdGNoZWQgPSAnbW91c2Vtb3ZlJztcbiAgICAgICAgICAgICAgICBzZXRTcGVjaWFsKGV2dCwgZGF0YSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSgpO1xuXG4gICAgZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQpIHsgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUsIGZhbHNlKTsgfVxuICAgICAgICBkZWZhdWx0U2V0dGluZ3MgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGRlc3Ryb3k6IGRlc3Ryb3ksXG4gICAgICAgIGRpc3BhdGNoOiBkaXNwYXRjaFxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vdmVJbml0KGRlZmF1bHRTZXR0aW5ncywgaW5pdE1vdmUpIHtcbiAgICBpbml0TW92ZSA9IGluaXRNb3ZlIHx8IHt9O1xuICAgIHZhciBzZXR0aW5ncyA9IG9iamVjdENyZWF0ZSQxKGRlZmF1bHRTZXR0aW5ncyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3VzZUV2ZW50UHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGluaXRNb3ZlW21vdXNlRXZlbnRQcm9wc1tpXV0gIT09IHVuZGVmaW5lZCkgeyBzZXR0aW5nc1ttb3VzZUV2ZW50UHJvcHNbaV1dID0gaW5pdE1vdmVbbW91c2VFdmVudFByb3BzW2ldXTsgfVxuICAgIH1cblxuICAgIHJldHVybiBzZXR0aW5ncztcbn1cblxuZnVuY3Rpb24gc2V0U3BlY2lhbChlLCBkYXRhKSB7XG4gICAgY29uc29sZS5sb2coJ2RhdGEgJywgZGF0YSk7XG4gICAgZS5kYXRhID0gZGF0YSB8fCB7fTtcbiAgICBlLmRpc3BhdGNoZWQgPSAnbW91c2Vtb3ZlJztcbn1cblxuZnVuY3Rpb24gQXV0b1Njcm9sbGVyKGVsZW1lbnRzLCBvcHRpb25zKXtcbiAgICBpZiAoIG9wdGlvbnMgPT09IHZvaWQgMCApIG9wdGlvbnMgPSB7fTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWF4U3BlZWQgPSA0LCBzY3JvbGxpbmcgPSBmYWxzZTtcblxuICAgIHRoaXMubWFyZ2luID0gb3B0aW9ucy5tYXJnaW4gfHwgLTE7XG4gICAgLy90aGlzLnNjcm9sbGluZyA9IGZhbHNlO1xuICAgIHRoaXMuc2Nyb2xsV2hlbk91dHNpZGUgPSBvcHRpb25zLnNjcm9sbFdoZW5PdXRzaWRlIHx8IGZhbHNlO1xuXG4gICAgdmFyIHBvaW50ID0ge30sXG4gICAgICAgIHBvaW50Q0IgPSBpbmRleCQyKHBvaW50KSxcbiAgICAgICAgZGlzcGF0Y2hlciA9IGNyZWF0ZURpc3BhdGNoZXIoKSxcbiAgICAgICAgZG93biA9IGZhbHNlO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHBvaW50Q0IsIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgcG9pbnRDQiwgZmFsc2UpO1xuXG4gICAgaWYoIWlzTmFOKG9wdGlvbnMubWF4U3BlZWQpKXtcbiAgICAgICAgbWF4U3BlZWQgPSBvcHRpb25zLm1heFNwZWVkO1xuICAgIH1cblxuICAgIHRoaXMuYXV0b1Njcm9sbCA9IGJvb2xlYW4ob3B0aW9ucy5hdXRvU2Nyb2xsKTtcbiAgICB0aGlzLnN5bmNNb3ZlID0gYm9vbGVhbihvcHRpb25zLnN5bmNNb3ZlLCBmYWxzZSk7XG5cbiAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHBvaW50Q0IsIGZhbHNlKTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHBvaW50Q0IsIGZhbHNlKTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG9uRG93biwgZmFsc2UpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uRG93biwgZmFsc2UpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uVXAsIGZhbHNlKTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25VcCwgZmFsc2UpO1xuXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUsIGZhbHNlKTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uTW92ZSwgZmFsc2UpO1xuXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBzZXRTY3JvbGwsIHRydWUpO1xuICAgICAgICBlbGVtZW50cyA9IFtdO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBlbGVtZW50ID0gW10sIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlICggbGVuLS0gKSBlbGVtZW50WyBsZW4gXSA9IGFyZ3VtZW50c1sgbGVuIF07XG5cbiAgICAgICAgYWRkRWxlbWVudHMuYXBwbHkodm9pZCAwLCBbIGVsZW1lbnRzIF0uY29uY2F0KCBlbGVtZW50ICkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgdGhpcy5yZW1vdmUgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZWxlbWVudCA9IFtdLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoIGxlbi0tICkgZWxlbWVudFsgbGVuIF0gPSBhcmd1bWVudHNbIGxlbiBdO1xuXG4gICAgICAgIHJldHVybiByZW1vdmVFbGVtZW50cy5hcHBseSh2b2lkIDAsIFsgZWxlbWVudHMgXS5jb25jYXQoIGVsZW1lbnQgKSk7XG4gICAgfTtcblxuICAgIHZhciBoYXNXaW5kb3cgPSBudWxsLCB3aW5kb3dBbmltYXRpb25GcmFtZTtcblxuICAgIGlmKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlbGVtZW50cykgIT09ICdbb2JqZWN0IEFycmF5XScpe1xuICAgICAgICBlbGVtZW50cyA9IFtlbGVtZW50c107XG4gICAgfVxuXG4gICAgKGZ1bmN0aW9uKHRlbXApe1xuICAgICAgICBlbGVtZW50cyA9IFtdO1xuICAgICAgICB0ZW1wLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgICAgICBpZihlbGVtZW50ID09PSB3aW5kb3cpe1xuICAgICAgICAgICAgICAgIGhhc1dpbmRvdyA9IHdpbmRvdztcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIHNlbGYuYWRkKGVsZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KGVsZW1lbnRzKSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAgIGRvd246IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXsgcmV0dXJuIGRvd247IH1cbiAgICAgICAgfSxcbiAgICAgICAgbWF4U3BlZWQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXsgcmV0dXJuIG1heFNwZWVkOyB9XG4gICAgICAgIH0sXG4gICAgICAgIHBvaW50OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7IHJldHVybiBwb2ludDsgfVxuICAgICAgICB9LFxuICAgICAgICBzY3JvbGxpbmc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXsgcmV0dXJuIHNjcm9sbGluZzsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbiA9IDAsIGN1cnJlbnQgPSBudWxsLCBhbmltYXRpb25GcmFtZTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvbkRvd24sIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uRG93biwgZmFsc2UpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25VcCwgZmFsc2UpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVXAsIGZhbHNlKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUsIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Nb3ZlLCBmYWxzZSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIG9uTW91c2VPdXQsIGZhbHNlKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBzZXRTY3JvbGwsIHRydWUpO1xuXG4gICAgZnVuY3Rpb24gc2V0U2Nyb2xsKGUpe1xuXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPGVsZW1lbnRzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGlmKGVsZW1lbnRzW2ldID09PSBlLnRhcmdldCl7XG4gICAgICAgICAgICAgICAgc2Nyb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNjcm9sbGluZyl7XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gKCl7IHJldHVybiBzY3JvbGxpbmcgPSBmYWxzZTsgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkRvd24oKXtcbiAgICAgICAgZG93biA9IHRydWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25VcCgpe1xuICAgICAgICBkb3duID0gZmFsc2U7XG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUod2luZG93QW5pbWF0aW9uRnJhbWUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTW91c2VPdXQoKXtcbiAgICAgICAgZG93biA9IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpe1xuICAgICAgICBpZighdGFyZ2V0KXtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoY3VycmVudCA9PT0gdGFyZ2V0KXtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZihoYXNFbGVtZW50KGVsZW1lbnRzLCB0YXJnZXQpKXtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSh0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZSl7XG4gICAgICAgICAgICBpZihoYXNFbGVtZW50KGVsZW1lbnRzLCB0YXJnZXQpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxlbWVudFVuZGVyUG9pbnQoKXtcbiAgICAgICAgdmFyIHVuZGVyUG9pbnQgPSBudWxsO1xuXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPGVsZW1lbnRzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGlmKGluc2lkZShwb2ludCwgZWxlbWVudHNbaV0pKXtcbiAgICAgICAgICAgICAgICB1bmRlclBvaW50ID0gZWxlbWVudHNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdW5kZXJQb2ludDtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIG9uTW92ZShldmVudCl7XG5cbiAgICAgICAgaWYoIXNlbGYuYXV0b1Njcm9sbCgpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIGlmKGV2ZW50WydkaXNwYXRjaGVkJ10peyByZXR1cm47IH1cblxuICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0LCBib2R5ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICBpZihjdXJyZW50ICYmICFpbnNpZGUocG9pbnQsIGN1cnJlbnQpKXtcbiAgICAgICAgICAgIGlmKCFzZWxmLnNjcm9sbFdoZW5PdXRzaWRlKXtcbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRhcmdldCAmJiB0YXJnZXQucGFyZW50Tm9kZSA9PT0gYm9keSl7XG4gICAgICAgICAgICAvL1RoZSBzcGVjaWFsIGNvbmRpdGlvbiB0byBpbXByb3ZlIHNwZWVkLlxuICAgICAgICAgICAgdGFyZ2V0ID0gZ2V0RWxlbWVudFVuZGVyUG9pbnQoKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB0YXJnZXQgPSBnZXRUYXJnZXQodGFyZ2V0KTtcblxuICAgICAgICAgICAgaWYoIXRhcmdldCl7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gZ2V0RWxlbWVudFVuZGVyUG9pbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYodGFyZ2V0ICYmIHRhcmdldCAhPT0gY3VycmVudCl7XG4gICAgICAgICAgICBjdXJyZW50ID0gdGFyZ2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoaGFzV2luZG93KXtcbiAgICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHdpbmRvd0FuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgICAgIHdpbmRvd0FuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHNjcm9sbFdpbmRvdyk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmKCFjdXJyZW50KXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW1hdGlvbkZyYW1lKTtcbiAgICAgICAgYW5pbWF0aW9uRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2Nyb2xsVGljayk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2Nyb2xsV2luZG93KCl7XG4gICAgICAgIGF1dG9TY3JvbGwoaGFzV2luZG93KTtcblxuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh3aW5kb3dBbmltYXRpb25GcmFtZSk7XG4gICAgICAgIHdpbmRvd0FuaW1hdGlvbkZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHNjcm9sbFdpbmRvdyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2Nyb2xsVGljaygpe1xuXG4gICAgICAgIGlmKCFjdXJyZW50KXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dG9TY3JvbGwoY3VycmVudCk7XG5cbiAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbWF0aW9uRnJhbWUpO1xuICAgICAgICBhbmltYXRpb25GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShzY3JvbGxUaWNrKTtcblxuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gYXV0b1Njcm9sbChlbCl7XG4gICAgICAgIHZhciByZWN0ID0gZ2V0Q2xpZW50UmVjdChlbCksIHNjcm9sbHgsIHNjcm9sbHk7XG5cbiAgICAgICAgaWYocG9pbnQueCA8IHJlY3QubGVmdCArIHNlbGYubWFyZ2luKXtcbiAgICAgICAgICAgIHNjcm9sbHggPSBNYXRoLmZsb29yKFxuICAgICAgICAgICAgICAgIE1hdGgubWF4KC0xLCAocG9pbnQueCAtIHJlY3QubGVmdCkgLyBzZWxmLm1hcmdpbiAtIDEpICogc2VsZi5tYXhTcGVlZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfWVsc2UgaWYocG9pbnQueCA+IHJlY3QucmlnaHQgLSBzZWxmLm1hcmdpbil7XG4gICAgICAgICAgICBzY3JvbGx4ID0gTWF0aC5jZWlsKFxuICAgICAgICAgICAgICAgIE1hdGgubWluKDEsIChwb2ludC54IC0gcmVjdC5yaWdodCkgLyBzZWxmLm1hcmdpbiArIDEpICogc2VsZi5tYXhTcGVlZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBzY3JvbGx4ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHBvaW50LnkgPCByZWN0LnRvcCArIHNlbGYubWFyZ2luKXtcbiAgICAgICAgICAgIHNjcm9sbHkgPSBNYXRoLmZsb29yKFxuICAgICAgICAgICAgICAgIE1hdGgubWF4KC0xLCAocG9pbnQueSAtIHJlY3QudG9wKSAvIHNlbGYubWFyZ2luIC0gMSkgKiBzZWxmLm1heFNwZWVkXG4gICAgICAgICAgICApO1xuICAgICAgICB9ZWxzZSBpZihwb2ludC55ID4gcmVjdC5ib3R0b20gLSBzZWxmLm1hcmdpbil7XG4gICAgICAgICAgICBzY3JvbGx5ID0gTWF0aC5jZWlsKFxuICAgICAgICAgICAgICAgIE1hdGgubWluKDEsIChwb2ludC55IC0gcmVjdC5ib3R0b20pIC8gc2VsZi5tYXJnaW4gKyAxKSAqIHNlbGYubWF4U3BlZWRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgc2Nyb2xseSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZihzZWxmLnN5bmNNb3ZlKCkpe1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIE5vdGVzIGFib3V0IG1vdXNlbW92ZSBldmVudCBkaXNwYXRjaC5cbiAgICAgICAgICAgIHNjcmVlbihYL1kpIHNob3VsZCBuZWVkIHRvIGJlIHVwZGF0ZWQuXG4gICAgICAgICAgICBTb21lIG90aGVyIHByb3BlcnRpZXMgbWlnaHQgbmVlZCB0byBiZSBzZXQuXG4gICAgICAgICAgICBLZWVwIHRoZSBzeW5jTW92ZSBvcHRpb24gZGVmYXVsdCBmYWxzZSB1bnRpbCBhbGwgaW5jb25zaXN0ZW5jaWVzIGFyZSB0YWtlbiBjYXJlIG9mLlxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goZWwsIHtcbiAgICAgICAgICAgICAgICBwYWdlWDogcG9pbnQucGFnZVggKyBzY3JvbGx4LFxuICAgICAgICAgICAgICAgIHBhZ2VZOiBwb2ludC5wYWdlWSArIHNjcm9sbHksXG4gICAgICAgICAgICAgICAgY2xpZW50WDogcG9pbnQueCArIHNjcm9sbHgsXG4gICAgICAgICAgICAgICAgY2xpZW50WTogcG9pbnQueSArIHNjcm9sbHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKXtcblxuICAgICAgICAgICAgaWYoc2Nyb2xseSl7XG4gICAgICAgICAgICAgICAgc2Nyb2xsWShlbCwgc2Nyb2xseSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHNjcm9sbHgpe1xuICAgICAgICAgICAgICAgIHNjcm9sbFgoZWwsIHNjcm9sbHgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjcm9sbFkoZWwsIGFtb3VudCl7XG4gICAgICAgIGlmKGVsID09PSB3aW5kb3cpe1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbFRvKGVsLnBhZ2VYT2Zmc2V0LCBlbC5wYWdlWU9mZnNldCArIGFtb3VudCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZWwuc2Nyb2xsVG9wICs9IGFtb3VudDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjcm9sbFgoZWwsIGFtb3VudCl7XG4gICAgICAgIGlmKGVsID09PSB3aW5kb3cpe1xuICAgICAgICAgICAgd2luZG93LnNjcm9sbFRvKGVsLnBhZ2VYT2Zmc2V0ICsgYW1vdW50LCBlbC5wYWdlWU9mZnNldCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCArPSBhbW91bnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gQXV0b1Njcm9sbGVyRmFjdG9yeShlbGVtZW50LCBvcHRpb25zKXtcbiAgICByZXR1cm4gbmV3IEF1dG9TY3JvbGxlcihlbGVtZW50LCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gaW5zaWRlKHBvaW50LCBlbCwgcmVjdCl7XG4gICAgaWYoIXJlY3Qpe1xuICAgICAgICByZXR1cm4gcG9pbnRJbnNpZGUocG9pbnQsIGVsKTtcbiAgICB9ZWxzZXtcbiAgICAgICAgcmV0dXJuIChwb2ludC55ID4gcmVjdC50b3AgJiYgcG9pbnQueSA8IHJlY3QuYm90dG9tICYmXG4gICAgICAgICAgICAgICAgcG9pbnQueCA+IHJlY3QubGVmdCAmJiBwb2ludC54IDwgcmVjdC5yaWdodCk7XG4gICAgfVxufVxuXG4vKlxuZ2l0IHJlbW90ZSBhZGQgb3JpZ2luIGh0dHBzOi8vZ2l0aHViLmNvbS9ob2xsb3dkb29yL2RvbV9hdXRvc2Nyb2xsZXIuZ2l0XG5naXQgcHVzaCAtdSBvcmlnaW4gbWFzdGVyXG4qL1xuXG5yZXR1cm4gQXV0b1Njcm9sbGVyRmFjdG9yeTtcblxufSgpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRvbS1hdXRvc2Nyb2xsZXIuanMubWFwXG4iLCIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhY2hlID0ge307XG52YXIgc3RhcnQgPSAnKD86XnxcXFxccyknO1xudmFyIGVuZCA9ICcoPzpcXFxcc3wkKSc7XG5cbmZ1bmN0aW9uIGxvb2t1cENsYXNzIChjbGFzc05hbWUpIHtcbiAgdmFyIGNhY2hlZCA9IGNhY2hlW2NsYXNzTmFtZV07XG4gIGlmIChjYWNoZWQpIHtcbiAgICBjYWNoZWQubGFzdEluZGV4ID0gMDtcbiAgfSBlbHNlIHtcbiAgICBjYWNoZVtjbGFzc05hbWVdID0gY2FjaGVkID0gbmV3IFJlZ0V4cChzdGFydCArIGNsYXNzTmFtZSArIGVuZCwgJ2cnKTtcbiAgfVxuICByZXR1cm4gY2FjaGVkO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyAoZWwsIGNsYXNzTmFtZSkge1xuICB2YXIgY3VycmVudCA9IGVsLmNsYXNzTmFtZTtcbiAgaWYgKCFjdXJyZW50Lmxlbmd0aCkge1xuICAgIGVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgfSBlbHNlIGlmICghbG9va3VwQ2xhc3MoY2xhc3NOYW1lKS50ZXN0KGN1cnJlbnQpKSB7XG4gICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBybUNsYXNzIChlbCwgY2xhc3NOYW1lKSB7XG4gIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKGxvb2t1cENsYXNzKGNsYXNzTmFtZSksICcgJykudHJpbSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRDbGFzcyxcbiAgcm06IHJtQ2xhc3Ncbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnY29udHJhL2VtaXR0ZXInKTtcbnZhciBjcm9zc3ZlbnQgPSByZXF1aXJlKCdjcm9zc3ZlbnQnKTtcbnZhciBjbGFzc2VzID0gcmVxdWlyZSgnLi9jbGFzc2VzJyk7XG52YXIgZG9jID0gZG9jdW1lbnQ7XG52YXIgZG9jdW1lbnRFbGVtZW50ID0gZG9jLmRvY3VtZW50RWxlbWVudDtcblxuZnVuY3Rpb24gZHJhZ3VsYSAoaW5pdGlhbENvbnRhaW5lcnMsIG9wdGlvbnMpIHtcbiAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDEgJiYgQXJyYXkuaXNBcnJheShpbml0aWFsQ29udGFpbmVycykgPT09IGZhbHNlKSB7XG4gICAgb3B0aW9ucyA9IGluaXRpYWxDb250YWluZXJzO1xuICAgIGluaXRpYWxDb250YWluZXJzID0gW107XG4gIH1cbiAgdmFyIF9taXJyb3I7IC8vIG1pcnJvciBpbWFnZVxuICB2YXIgX3NvdXJjZTsgLy8gc291cmNlIGNvbnRhaW5lclxuICB2YXIgX2l0ZW07IC8vIGl0ZW0gYmVpbmcgZHJhZ2dlZFxuICB2YXIgX29mZnNldFg7IC8vIHJlZmVyZW5jZSB4XG4gIHZhciBfb2Zmc2V0WTsgLy8gcmVmZXJlbmNlIHlcbiAgdmFyIF9tb3ZlWDsgLy8gcmVmZXJlbmNlIG1vdmUgeFxuICB2YXIgX21vdmVZOyAvLyByZWZlcmVuY2UgbW92ZSB5XG4gIHZhciBfaW5pdGlhbFNpYmxpbmc7IC8vIHJlZmVyZW5jZSBzaWJsaW5nIHdoZW4gZ3JhYmJlZFxuICB2YXIgX2N1cnJlbnRTaWJsaW5nOyAvLyByZWZlcmVuY2Ugc2libGluZyBub3dcbiAgdmFyIF9jb3B5OyAvLyBpdGVtIHVzZWQgZm9yIGNvcHlpbmdcbiAgdmFyIF9yZW5kZXJUaW1lcjsgLy8gdGltZXIgZm9yIHNldFRpbWVvdXQgcmVuZGVyTWlycm9ySW1hZ2VcbiAgdmFyIF9sYXN0RHJvcFRhcmdldCA9IG51bGw7IC8vIGxhc3QgY29udGFpbmVyIGl0ZW0gd2FzIG92ZXJcbiAgdmFyIF9ncmFiYmVkOyAvLyBob2xkcyBtb3VzZWRvd24gY29udGV4dCB1bnRpbCBmaXJzdCBtb3VzZW1vdmVcblxuICB2YXIgbyA9IG9wdGlvbnMgfHwge307XG4gIGlmIChvLm1vdmVzID09PSB2b2lkIDApIHsgby5tb3ZlcyA9IGFsd2F5czsgfVxuICBpZiAoby5hY2NlcHRzID09PSB2b2lkIDApIHsgby5hY2NlcHRzID0gYWx3YXlzOyB9XG4gIGlmIChvLmludmFsaWQgPT09IHZvaWQgMCkgeyBvLmludmFsaWQgPSBpbnZhbGlkVGFyZ2V0OyB9XG4gIGlmIChvLmNvbnRhaW5lcnMgPT09IHZvaWQgMCkgeyBvLmNvbnRhaW5lcnMgPSBpbml0aWFsQ29udGFpbmVycyB8fCBbXTsgfVxuICBpZiAoby5pc0NvbnRhaW5lciA9PT0gdm9pZCAwKSB7IG8uaXNDb250YWluZXIgPSBuZXZlcjsgfVxuICBpZiAoby5jb3B5ID09PSB2b2lkIDApIHsgby5jb3B5ID0gZmFsc2U7IH1cbiAgaWYgKG8uY29weVNvcnRTb3VyY2UgPT09IHZvaWQgMCkgeyBvLmNvcHlTb3J0U291cmNlID0gZmFsc2U7IH1cbiAgaWYgKG8ucmV2ZXJ0T25TcGlsbCA9PT0gdm9pZCAwKSB7IG8ucmV2ZXJ0T25TcGlsbCA9IGZhbHNlOyB9XG4gIGlmIChvLnJlbW92ZU9uU3BpbGwgPT09IHZvaWQgMCkgeyBvLnJlbW92ZU9uU3BpbGwgPSBmYWxzZTsgfVxuICBpZiAoby5kaXJlY3Rpb24gPT09IHZvaWQgMCkgeyBvLmRpcmVjdGlvbiA9ICd2ZXJ0aWNhbCc7IH1cbiAgaWYgKG8uaWdub3JlSW5wdXRUZXh0U2VsZWN0aW9uID09PSB2b2lkIDApIHsgby5pZ25vcmVJbnB1dFRleHRTZWxlY3Rpb24gPSB0cnVlOyB9XG4gIGlmIChvLm1pcnJvckNvbnRhaW5lciA9PT0gdm9pZCAwKSB7IG8ubWlycm9yQ29udGFpbmVyID0gZG9jLmJvZHk7IH1cblxuICB2YXIgZHJha2UgPSBlbWl0dGVyKHtcbiAgICBjb250YWluZXJzOiBvLmNvbnRhaW5lcnMsXG4gICAgc3RhcnQ6IG1hbnVhbFN0YXJ0LFxuICAgIGVuZDogZW5kLFxuICAgIGNhbmNlbDogY2FuY2VsLFxuICAgIHJlbW92ZTogcmVtb3ZlLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3ksXG4gICAgY2FuTW92ZTogY2FuTW92ZSxcbiAgICBkcmFnZ2luZzogZmFsc2VcbiAgfSk7XG5cbiAgaWYgKG8ucmVtb3ZlT25TcGlsbCA9PT0gdHJ1ZSkge1xuICAgIGRyYWtlLm9uKCdvdmVyJywgc3BpbGxPdmVyKS5vbignb3V0Jywgc3BpbGxPdXQpO1xuICB9XG5cbiAgZXZlbnRzKCk7XG5cbiAgcmV0dXJuIGRyYWtlO1xuXG4gIGZ1bmN0aW9uIGlzQ29udGFpbmVyIChlbCkge1xuICAgIHJldHVybiBkcmFrZS5jb250YWluZXJzLmluZGV4T2YoZWwpICE9PSAtMSB8fCBvLmlzQ29udGFpbmVyKGVsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2ZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ21vdXNlZG93bicsIGdyYWIpO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnbW91c2V1cCcsIHJlbGVhc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZXZlbnR1YWxNb3ZlbWVudHMgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgb3AsICdtb3VzZW1vdmUnLCBzdGFydEJlY2F1c2VNb3VzZU1vdmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVtZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICBjcm9zc3ZlbnRbb3BdKGRvY3VtZW50RWxlbWVudCwgJ3NlbGVjdHN0YXJ0JywgcHJldmVudEdyYWJiZWQpOyAvLyBJRThcbiAgICBjcm9zc3ZlbnRbb3BdKGRvY3VtZW50RWxlbWVudCwgJ2NsaWNrJywgcHJldmVudEdyYWJiZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgZXZlbnRzKHRydWUpO1xuICAgIHJlbGVhc2Uoe30pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldmVudEdyYWJiZWQgKGUpIHtcbiAgICBpZiAoX2dyYWJiZWQpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBncmFiIChlKSB7XG4gICAgX21vdmVYID0gZS5jbGllbnRYO1xuICAgIF9tb3ZlWSA9IGUuY2xpZW50WTtcblxuICAgIHZhciBpZ25vcmUgPSB3aGljaE1vdXNlQnV0dG9uKGUpICE9PSAxIHx8IGUubWV0YUtleSB8fCBlLmN0cmxLZXk7XG4gICAgaWYgKGlnbm9yZSkge1xuICAgICAgcmV0dXJuOyAvLyB3ZSBvbmx5IGNhcmUgYWJvdXQgaG9uZXN0LXRvLWdvZCBsZWZ0IGNsaWNrcyBhbmQgdG91Y2ggZXZlbnRzXG4gICAgfVxuICAgIHZhciBpdGVtID0gZS50YXJnZXQ7XG4gICAgdmFyIGNvbnRleHQgPSBjYW5TdGFydChpdGVtKTtcbiAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2dyYWJiZWQgPSBjb250ZXh0O1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKCk7XG4gICAgaWYgKGUudHlwZSA9PT0gJ21vdXNlZG93bicpIHtcbiAgICAgIGlmIChpc0lucHV0KGl0ZW0pKSB7IC8vIHNlZSBhbHNvOiBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMjA4XG4gICAgICAgIGl0ZW0uZm9jdXMoKTsgLy8gZml4ZXMgaHR0cHM6Ly9naXRodWIuY29tL2JldmFjcXVhL2RyYWd1bGEvaXNzdWVzLzE3NlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyBmaXhlcyBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMTU1XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRCZWNhdXNlTW91c2VNb3ZlZCAoZSkge1xuICAgIGlmICghX2dyYWJiZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHdoaWNoTW91c2VCdXR0b24oZSkgPT09IDApIHtcbiAgICAgIHJlbGVhc2Uoe30pO1xuICAgICAgcmV0dXJuOyAvLyB3aGVuIHRleHQgaXMgc2VsZWN0ZWQgb24gYW4gaW5wdXQgYW5kIHRoZW4gZHJhZ2dlZCwgbW91c2V1cCBkb2Vzbid0IGZpcmUuIHRoaXMgaXMgb3VyIG9ubHkgaG9wZVxuICAgIH1cbiAgICAvLyB0cnV0aHkgY2hlY2sgZml4ZXMgIzIzOSwgZXF1YWxpdHkgZml4ZXMgIzIwN1xuICAgIGlmIChlLmNsaWVudFggIT09IHZvaWQgMCAmJiBlLmNsaWVudFggPT09IF9tb3ZlWCAmJiBlLmNsaWVudFkgIT09IHZvaWQgMCAmJiBlLmNsaWVudFkgPT09IF9tb3ZlWSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoby5pZ25vcmVJbnB1dFRleHRTZWxlY3Rpb24pIHtcbiAgICAgIHZhciBjbGllbnRYID0gZ2V0Q29vcmQoJ2NsaWVudFgnLCBlKTtcbiAgICAgIHZhciBjbGllbnRZID0gZ2V0Q29vcmQoJ2NsaWVudFknLCBlKTtcbiAgICAgIHZhciBlbGVtZW50QmVoaW5kQ3Vyc29yID0gZG9jLmVsZW1lbnRGcm9tUG9pbnQoY2xpZW50WCwgY2xpZW50WSk7XG4gICAgICBpZiAoaXNJbnB1dChlbGVtZW50QmVoaW5kQ3Vyc29yKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGdyYWJiZWQgPSBfZ3JhYmJlZDsgLy8gY2FsbCB0byBlbmQoKSB1bnNldHMgX2dyYWJiZWRcbiAgICBldmVudHVhbE1vdmVtZW50cyh0cnVlKTtcbiAgICBtb3ZlbWVudHMoKTtcbiAgICBlbmQoKTtcbiAgICBzdGFydChncmFiYmVkKTtcblxuICAgIHZhciBvZmZzZXQgPSBnZXRPZmZzZXQoX2l0ZW0pO1xuICAgIF9vZmZzZXRYID0gZ2V0Q29vcmQoJ3BhZ2VYJywgZSkgLSBvZmZzZXQubGVmdDtcbiAgICBfb2Zmc2V0WSA9IGdldENvb3JkKCdwYWdlWScsIGUpIC0gb2Zmc2V0LnRvcDtcblxuICAgIGNsYXNzZXMuYWRkKF9jb3B5IHx8IF9pdGVtLCAnZ3UtdHJhbnNpdCcpO1xuICAgIHJlbmRlck1pcnJvckltYWdlKCk7XG4gICAgZHJhZyhlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhblN0YXJ0IChpdGVtKSB7XG4gICAgaWYgKGRyYWtlLmRyYWdnaW5nICYmIF9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzQ29udGFpbmVyKGl0ZW0pKSB7XG4gICAgICByZXR1cm47IC8vIGRvbid0IGRyYWcgY29udGFpbmVyIGl0c2VsZlxuICAgIH1cbiAgICB2YXIgaGFuZGxlID0gaXRlbTtcbiAgICB3aGlsZSAoZ2V0UGFyZW50KGl0ZW0pICYmIGlzQ29udGFpbmVyKGdldFBhcmVudChpdGVtKSkgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoby5pbnZhbGlkKGl0ZW0sIGhhbmRsZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaXRlbSA9IGdldFBhcmVudChpdGVtKTsgLy8gZHJhZyB0YXJnZXQgc2hvdWxkIGJlIGEgdG9wIGVsZW1lbnRcbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBzb3VyY2UgPSBnZXRQYXJlbnQoaXRlbSk7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG8uaW52YWxpZChpdGVtLCBoYW5kbGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG1vdmFibGUgPSBvLm1vdmVzKGl0ZW0sIHNvdXJjZSwgaGFuZGxlLCBuZXh0RWwoaXRlbSkpO1xuICAgIGlmICghbW92YWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpdGVtOiBpdGVtLFxuICAgICAgc291cmNlOiBzb3VyY2VcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuTW92ZSAoaXRlbSkge1xuICAgIHJldHVybiAhIWNhblN0YXJ0KGl0ZW0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbWFudWFsU3RhcnQgKGl0ZW0pIHtcbiAgICB2YXIgY29udGV4dCA9IGNhblN0YXJ0KGl0ZW0pO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBzdGFydChjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydCAoY29udGV4dCkge1xuICAgIGlmIChpc0NvcHkoY29udGV4dC5pdGVtLCBjb250ZXh0LnNvdXJjZSkpIHtcbiAgICAgIF9jb3B5ID0gY29udGV4dC5pdGVtLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIGRyYWtlLmVtaXQoJ2Nsb25lZCcsIF9jb3B5LCBjb250ZXh0Lml0ZW0sICdjb3B5Jyk7XG4gICAgfVxuXG4gICAgX3NvdXJjZSA9IGNvbnRleHQuc291cmNlO1xuICAgIF9pdGVtID0gY29udGV4dC5pdGVtO1xuICAgIF9pbml0aWFsU2libGluZyA9IF9jdXJyZW50U2libGluZyA9IG5leHRFbChjb250ZXh0Lml0ZW0pO1xuXG4gICAgZHJha2UuZHJhZ2dpbmcgPSB0cnVlO1xuICAgIGRyYWtlLmVtaXQoJ2RyYWcnLCBfaXRlbSwgX3NvdXJjZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbnZhbGlkVGFyZ2V0ICgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBlbmQgKCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICBkcm9wKGl0ZW0sIGdldFBhcmVudChpdGVtKSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bmdyYWIgKCkge1xuICAgIF9ncmFiYmVkID0gZmFsc2U7XG4gICAgZXZlbnR1YWxNb3ZlbWVudHModHJ1ZSk7XG4gICAgbW92ZW1lbnRzKHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVsZWFzZSAoZSkge1xuICAgIHVuZ3JhYigpO1xuXG4gICAgaWYgKCFkcmFrZS5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBjbGllbnRYID0gZ2V0Q29vcmQoJ2NsaWVudFgnLCBlKTtcbiAgICB2YXIgY2xpZW50WSA9IGdldENvb3JkKCdjbGllbnRZJywgZSk7XG4gICAgdmFyIGVsZW1lbnRCZWhpbmRDdXJzb3IgPSBnZXRFbGVtZW50QmVoaW5kUG9pbnQoX21pcnJvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgdmFyIGRyb3BUYXJnZXQgPSBmaW5kRHJvcFRhcmdldChlbGVtZW50QmVoaW5kQ3Vyc29yLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICBpZiAoZHJvcFRhcmdldCAmJiAoKF9jb3B5ICYmIG8uY29weVNvcnRTb3VyY2UpIHx8ICghX2NvcHkgfHwgZHJvcFRhcmdldCAhPT0gX3NvdXJjZSkpKSB7XG4gICAgICBkcm9wKGl0ZW0sIGRyb3BUYXJnZXQpO1xuICAgIH0gZWxzZSBpZiAoby5yZW1vdmVPblNwaWxsKSB7XG4gICAgICByZW1vdmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FuY2VsKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZHJvcCAoaXRlbSwgdGFyZ2V0KSB7XG4gICAgdmFyIHBhcmVudCA9IGdldFBhcmVudChpdGVtKTtcbiAgICBpZiAoX2NvcHkgJiYgby5jb3B5U29ydFNvdXJjZSAmJiB0YXJnZXQgPT09IF9zb3VyY2UpIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChfaXRlbSk7XG4gICAgfVxuICAgIGlmIChpc0luaXRpYWxQbGFjZW1lbnQodGFyZ2V0KSkge1xuICAgICAgZHJha2UuZW1pdCgnY2FuY2VsJywgaXRlbSwgX3NvdXJjZSwgX3NvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2Ryb3AnLCBpdGVtLCB0YXJnZXQsIF9zb3VyY2UsIF9jdXJyZW50U2libGluZyk7XG4gICAgfVxuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZSAoKSB7XG4gICAgaWYgKCFkcmFrZS5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBwYXJlbnQgPSBnZXRQYXJlbnQoaXRlbSk7XG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgIH1cbiAgICBkcmFrZS5lbWl0KF9jb3B5ID8gJ2NhbmNlbCcgOiAncmVtb3ZlJywgaXRlbSwgcGFyZW50LCBfc291cmNlKTtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5jZWwgKHJldmVydCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldmVydHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMCA/IHJldmVydCA6IG8ucmV2ZXJ0T25TcGlsbDtcbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBwYXJlbnQgPSBnZXRQYXJlbnQoaXRlbSk7XG4gICAgdmFyIGluaXRpYWwgPSBpc0luaXRpYWxQbGFjZW1lbnQocGFyZW50KTtcbiAgICBpZiAoaW5pdGlhbCA9PT0gZmFsc2UgJiYgcmV2ZXJ0cykge1xuICAgICAgaWYgKF9jb3B5KSB7XG4gICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoX2NvcHkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfc291cmNlLmluc2VydEJlZm9yZShpdGVtLCBfaW5pdGlhbFNpYmxpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaW5pdGlhbCB8fCByZXZlcnRzKSB7XG4gICAgICBkcmFrZS5lbWl0KCdjYW5jZWwnLCBpdGVtLCBfc291cmNlLCBfc291cmNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZHJha2UuZW1pdCgnZHJvcCcsIGl0ZW0sIHBhcmVudCwgX3NvdXJjZSwgX2N1cnJlbnRTaWJsaW5nKTtcbiAgICB9XG4gICAgY2xlYW51cCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYW51cCAoKSB7XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB1bmdyYWIoKTtcbiAgICByZW1vdmVNaXJyb3JJbWFnZSgpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICBjbGFzc2VzLnJtKGl0ZW0sICdndS10cmFuc2l0Jyk7XG4gICAgfVxuICAgIGlmIChfcmVuZGVyVGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dChfcmVuZGVyVGltZXIpO1xuICAgIH1cbiAgICBkcmFrZS5kcmFnZ2luZyA9IGZhbHNlO1xuICAgIGlmIChfbGFzdERyb3BUYXJnZXQpIHtcbiAgICAgIGRyYWtlLmVtaXQoJ291dCcsIGl0ZW0sIF9sYXN0RHJvcFRhcmdldCwgX3NvdXJjZSk7XG4gICAgfVxuICAgIGRyYWtlLmVtaXQoJ2RyYWdlbmQnLCBpdGVtKTtcbiAgICBfc291cmNlID0gX2l0ZW0gPSBfY29weSA9IF9pbml0aWFsU2libGluZyA9IF9jdXJyZW50U2libGluZyA9IF9yZW5kZXJUaW1lciA9IF9sYXN0RHJvcFRhcmdldCA9IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBpc0luaXRpYWxQbGFjZW1lbnQgKHRhcmdldCwgcykge1xuICAgIHZhciBzaWJsaW5nO1xuICAgIGlmIChzICE9PSB2b2lkIDApIHtcbiAgICAgIHNpYmxpbmcgPSBzO1xuICAgIH0gZWxzZSBpZiAoX21pcnJvcikge1xuICAgICAgc2libGluZyA9IF9jdXJyZW50U2libGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgc2libGluZyA9IG5leHRFbChfY29weSB8fCBfaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQgPT09IF9zb3VyY2UgJiYgc2libGluZyA9PT0gX2luaXRpYWxTaWJsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZERyb3BUYXJnZXQgKGVsZW1lbnRCZWhpbmRDdXJzb3IsIGNsaWVudFgsIGNsaWVudFkpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZWxlbWVudEJlaGluZEN1cnNvcjtcbiAgICB3aGlsZSAodGFyZ2V0ICYmICFhY2NlcHRlZCgpKSB7XG4gICAgICB0YXJnZXQgPSBnZXRQYXJlbnQodGFyZ2V0KTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcblxuICAgIGZ1bmN0aW9uIGFjY2VwdGVkICgpIHtcbiAgICAgIHZhciBkcm9wcGFibGUgPSBpc0NvbnRhaW5lcih0YXJnZXQpO1xuICAgICAgaWYgKGRyb3BwYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgaW1tZWRpYXRlID0gZ2V0SW1tZWRpYXRlQ2hpbGQodGFyZ2V0LCBlbGVtZW50QmVoaW5kQ3Vyc29yKTtcbiAgICAgIHZhciByZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2UodGFyZ2V0LCBpbW1lZGlhdGUsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgICAgdmFyIGluaXRpYWwgPSBpc0luaXRpYWxQbGFjZW1lbnQodGFyZ2V0LCByZWZlcmVuY2UpO1xuICAgICAgaWYgKGluaXRpYWwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIHNob3VsZCBhbHdheXMgYmUgYWJsZSB0byBkcm9wIGl0IHJpZ2h0IGJhY2sgd2hlcmUgaXQgd2FzXG4gICAgICB9XG4gICAgICByZXR1cm4gby5hY2NlcHRzKF9pdGVtLCB0YXJnZXQsIF9zb3VyY2UsIHJlZmVyZW5jZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZHJhZyAoZSkge1xuICAgIGlmICghX21pcnJvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgY2xpZW50WCA9IGdldENvb3JkKCdjbGllbnRYJywgZSk7XG4gICAgdmFyIGNsaWVudFkgPSBnZXRDb29yZCgnY2xpZW50WScsIGUpO1xuICAgIHZhciB4ID0gY2xpZW50WCAtIF9vZmZzZXRYO1xuICAgIHZhciB5ID0gY2xpZW50WSAtIF9vZmZzZXRZO1xuXG4gICAgX21pcnJvci5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgX21pcnJvci5zdHlsZS50b3AgPSB5ICsgJ3B4JztcblxuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgdmFyIGVsZW1lbnRCZWhpbmRDdXJzb3IgPSBnZXRFbGVtZW50QmVoaW5kUG9pbnQoX21pcnJvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgdmFyIGRyb3BUYXJnZXQgPSBmaW5kRHJvcFRhcmdldChlbGVtZW50QmVoaW5kQ3Vyc29yLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICB2YXIgY2hhbmdlZCA9IGRyb3BUYXJnZXQgIT09IG51bGwgJiYgZHJvcFRhcmdldCAhPT0gX2xhc3REcm9wVGFyZ2V0O1xuICAgIGlmIChjaGFuZ2VkIHx8IGRyb3BUYXJnZXQgPT09IG51bGwpIHtcbiAgICAgIG91dCgpO1xuICAgICAgX2xhc3REcm9wVGFyZ2V0ID0gZHJvcFRhcmdldDtcbiAgICAgIG92ZXIoKTtcbiAgICB9XG4gICAgdmFyIHBhcmVudCA9IGdldFBhcmVudChpdGVtKTtcbiAgICBpZiAoZHJvcFRhcmdldCA9PT0gX3NvdXJjZSAmJiBfY29weSAmJiAhby5jb3B5U29ydFNvdXJjZSkge1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZWZlcmVuY2U7XG4gICAgdmFyIGltbWVkaWF0ZSA9IGdldEltbWVkaWF0ZUNoaWxkKGRyb3BUYXJnZXQsIGVsZW1lbnRCZWhpbmRDdXJzb3IpO1xuICAgIGlmIChpbW1lZGlhdGUgIT09IG51bGwpIHtcbiAgICAgIHJlZmVyZW5jZSA9IGdldFJlZmVyZW5jZShkcm9wVGFyZ2V0LCBpbW1lZGlhdGUsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIH0gZWxzZSBpZiAoby5yZXZlcnRPblNwaWxsID09PSB0cnVlICYmICFfY29weSkge1xuICAgICAgcmVmZXJlbmNlID0gX2luaXRpYWxTaWJsaW5nO1xuICAgICAgZHJvcFRhcmdldCA9IF9zb3VyY2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChfY29weSAmJiBwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICAocmVmZXJlbmNlID09PSBudWxsICYmIGNoYW5nZWQpIHx8XG4gICAgICByZWZlcmVuY2UgIT09IGl0ZW0gJiZcbiAgICAgIHJlZmVyZW5jZSAhPT0gbmV4dEVsKGl0ZW0pXG4gICAgKSB7XG4gICAgICBfY3VycmVudFNpYmxpbmcgPSByZWZlcmVuY2U7XG4gICAgICBkcm9wVGFyZ2V0Lmluc2VydEJlZm9yZShpdGVtLCByZWZlcmVuY2UpO1xuICAgICAgZHJha2UuZW1pdCgnc2hhZG93JywgaXRlbSwgZHJvcFRhcmdldCwgX3NvdXJjZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1vdmVkICh0eXBlKSB7IGRyYWtlLmVtaXQodHlwZSwgaXRlbSwgX2xhc3REcm9wVGFyZ2V0LCBfc291cmNlKTsgfVxuICAgIGZ1bmN0aW9uIG92ZXIgKCkgeyBpZiAoY2hhbmdlZCkgeyBtb3ZlZCgnb3ZlcicpOyB9IH1cbiAgICBmdW5jdGlvbiBvdXQgKCkgeyBpZiAoX2xhc3REcm9wVGFyZ2V0KSB7IG1vdmVkKCdvdXQnKTsgfSB9XG4gIH1cblxuICBmdW5jdGlvbiBzcGlsbE92ZXIgKGVsKSB7XG4gICAgY2xhc3Nlcy5ybShlbCwgJ2d1LWhpZGUnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNwaWxsT3V0IChlbCkge1xuICAgIGlmIChkcmFrZS5kcmFnZ2luZykgeyBjbGFzc2VzLmFkZChlbCwgJ2d1LWhpZGUnKTsgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVuZGVyTWlycm9ySW1hZ2UgKCkge1xuICAgIGlmIChfbWlycm9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZWN0ID0gX2l0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgX21pcnJvciA9IF9pdGVtLmNsb25lTm9kZSh0cnVlKTtcbiAgICBfbWlycm9yLnN0eWxlLndpZHRoID0gZ2V0UmVjdFdpZHRoKHJlY3QpICsgJ3B4JztcbiAgICBfbWlycm9yLnN0eWxlLmhlaWdodCA9IGdldFJlY3RIZWlnaHQocmVjdCkgKyAncHgnO1xuICAgIGNsYXNzZXMucm0oX21pcnJvciwgJ2d1LXRyYW5zaXQnKTtcbiAgICBjbGFzc2VzLmFkZChfbWlycm9yLCAnZ3UtbWlycm9yJyk7XG4gICAgby5taXJyb3JDb250YWluZXIuYXBwZW5kQ2hpbGQoX21pcnJvcik7XG4gICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgJ2FkZCcsICdtb3VzZW1vdmUnLCBkcmFnKTtcbiAgICBjbGFzc2VzLmFkZChvLm1pcnJvckNvbnRhaW5lciwgJ2d1LXVuc2VsZWN0YWJsZScpO1xuICAgIGRyYWtlLmVtaXQoJ2Nsb25lZCcsIF9taXJyb3IsIF9pdGVtLCAnbWlycm9yJyk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVNaXJyb3JJbWFnZSAoKSB7XG4gICAgaWYgKF9taXJyb3IpIHtcbiAgICAgIGNsYXNzZXMucm0oby5taXJyb3JDb250YWluZXIsICdndS11bnNlbGVjdGFibGUnKTtcbiAgICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsICdyZW1vdmUnLCAnbW91c2Vtb3ZlJywgZHJhZyk7XG4gICAgICBnZXRQYXJlbnQoX21pcnJvcikucmVtb3ZlQ2hpbGQoX21pcnJvcik7XG4gICAgICBfbWlycm9yID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbW1lZGlhdGVDaGlsZCAoZHJvcFRhcmdldCwgdGFyZ2V0KSB7XG4gICAgdmFyIGltbWVkaWF0ZSA9IHRhcmdldDtcbiAgICB3aGlsZSAoaW1tZWRpYXRlICE9PSBkcm9wVGFyZ2V0ICYmIGdldFBhcmVudChpbW1lZGlhdGUpICE9PSBkcm9wVGFyZ2V0KSB7XG4gICAgICBpbW1lZGlhdGUgPSBnZXRQYXJlbnQoaW1tZWRpYXRlKTtcbiAgICB9XG4gICAgaWYgKGltbWVkaWF0ZSA9PT0gZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGltbWVkaWF0ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZmVyZW5jZSAoZHJvcFRhcmdldCwgdGFyZ2V0LCB4LCB5KSB7XG4gICAgdmFyIGhvcml6b250YWwgPSBvLmRpcmVjdGlvbiA9PT0gJ2hvcml6b250YWwnO1xuICAgIHZhciByZWZlcmVuY2UgPSB0YXJnZXQgIT09IGRyb3BUYXJnZXQgPyBpbnNpZGUoKSA6IG91dHNpZGUoKTtcbiAgICByZXR1cm4gcmVmZXJlbmNlO1xuXG4gICAgZnVuY3Rpb24gb3V0c2lkZSAoKSB7IC8vIHNsb3dlciwgYnV0IGFibGUgdG8gZmlndXJlIG91dCBhbnkgcG9zaXRpb25cbiAgICAgIHZhciBsZW4gPSBkcm9wVGFyZ2V0LmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgIHZhciBpO1xuICAgICAgdmFyIGVsO1xuICAgICAgdmFyIHJlY3Q7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgZWwgPSBkcm9wVGFyZ2V0LmNoaWxkcmVuW2ldO1xuICAgICAgICByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGlmIChob3Jpem9udGFsICYmIChyZWN0LmxlZnQgKyByZWN0LndpZHRoIC8gMikgPiB4KSB7IHJldHVybiBlbDsgfVxuICAgICAgICBpZiAoIWhvcml6b250YWwgJiYgKHJlY3QudG9wICsgcmVjdC5oZWlnaHQgLyAyKSA+IHkpIHsgcmV0dXJuIGVsOyB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNpZGUgKCkgeyAvLyBmYXN0ZXIsIGJ1dCBvbmx5IGF2YWlsYWJsZSBpZiBkcm9wcGVkIGluc2lkZSBhIGNoaWxkIGVsZW1lbnRcbiAgICAgIHZhciByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgaWYgKGhvcml6b250YWwpIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoeCA+IHJlY3QubGVmdCArIGdldFJlY3RXaWR0aChyZWN0KSAvIDIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc29sdmUoeSA+IHJlY3QudG9wICsgZ2V0UmVjdEhlaWdodChyZWN0KSAvIDIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmUgKGFmdGVyKSB7XG4gICAgICByZXR1cm4gYWZ0ZXIgPyBuZXh0RWwodGFyZ2V0KSA6IHRhcmdldDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpc0NvcHkgKGl0ZW0sIGNvbnRhaW5lcikge1xuICAgIHJldHVybiB0eXBlb2Ygby5jb3B5ID09PSAnYm9vbGVhbicgPyBvLmNvcHkgOiBvLmNvcHkoaXRlbSwgY29udGFpbmVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0b3VjaHkgKGVsLCBvcCwgdHlwZSwgZm4pIHtcbiAgdmFyIHRvdWNoID0ge1xuICAgIG1vdXNldXA6ICd0b3VjaGVuZCcsXG4gICAgbW91c2Vkb3duOiAndG91Y2hzdGFydCcsXG4gICAgbW91c2Vtb3ZlOiAndG91Y2htb3ZlJ1xuICB9O1xuICB2YXIgcG9pbnRlcnMgPSB7XG4gICAgbW91c2V1cDogJ3BvaW50ZXJ1cCcsXG4gICAgbW91c2Vkb3duOiAncG9pbnRlcmRvd24nLFxuICAgIG1vdXNlbW92ZTogJ3BvaW50ZXJtb3ZlJ1xuICB9O1xuICB2YXIgbWljcm9zb2Z0ID0ge1xuICAgIG1vdXNldXA6ICdNU1BvaW50ZXJVcCcsXG4gICAgbW91c2Vkb3duOiAnTVNQb2ludGVyRG93bicsXG4gICAgbW91c2Vtb3ZlOiAnTVNQb2ludGVyTW92ZSdcbiAgfTtcbiAgaWYgKGdsb2JhbC5uYXZpZ2F0b3IucG9pbnRlckVuYWJsZWQpIHtcbiAgICBjcm9zc3ZlbnRbb3BdKGVsLCBwb2ludGVyc1t0eXBlXSwgZm4pO1xuICB9IGVsc2UgaWYgKGdsb2JhbC5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZCkge1xuICAgIGNyb3NzdmVudFtvcF0oZWwsIG1pY3Jvc29mdFt0eXBlXSwgZm4pO1xuICB9IGVsc2Uge1xuICAgIGNyb3NzdmVudFtvcF0oZWwsIHRvdWNoW3R5cGVdLCBmbik7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgdHlwZSwgZm4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdoaWNoTW91c2VCdXR0b24gKGUpIHtcbiAgaWYgKGUudG91Y2hlcyAhPT0gdm9pZCAwKSB7IHJldHVybiBlLnRvdWNoZXMubGVuZ3RoOyB9XG4gIGlmIChlLndoaWNoICE9PSB2b2lkIDAgJiYgZS53aGljaCAhPT0gMCkgeyByZXR1cm4gZS53aGljaDsgfSAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2JldmFjcXVhL2RyYWd1bGEvaXNzdWVzLzI2MVxuICBpZiAoZS5idXR0b25zICE9PSB2b2lkIDApIHsgcmV0dXJuIGUuYnV0dG9uczsgfVxuICB2YXIgYnV0dG9uID0gZS5idXR0b247XG4gIGlmIChidXR0b24gIT09IHZvaWQgMCkgeyAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi85OWU4ZmYxYmFhN2FlMzQxZTk0YmI4OWMzZTg0NTcwYzdjM2FkOWVhL3NyYy9ldmVudC5qcyNMNTczLUw1NzVcbiAgICByZXR1cm4gYnV0dG9uICYgMSA/IDEgOiBidXR0b24gJiAyID8gMyA6IChidXR0b24gJiA0ID8gMiA6IDApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE9mZnNldCAoZWwpIHtcbiAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiByZWN0LmxlZnQgKyBnZXRTY3JvbGwoJ3Njcm9sbExlZnQnLCAncGFnZVhPZmZzZXQnKSxcbiAgICB0b3A6IHJlY3QudG9wICsgZ2V0U2Nyb2xsKCdzY3JvbGxUb3AnLCAncGFnZVlPZmZzZXQnKVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTY3JvbGwgKHNjcm9sbFByb3AsIG9mZnNldFByb3ApIHtcbiAgaWYgKHR5cGVvZiBnbG9iYWxbb2Zmc2V0UHJvcF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGdsb2JhbFtvZmZzZXRQcm9wXTtcbiAgfVxuICBpZiAoZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCkge1xuICAgIHJldHVybiBkb2N1bWVudEVsZW1lbnRbc2Nyb2xsUHJvcF07XG4gIH1cbiAgcmV0dXJuIGRvYy5ib2R5W3Njcm9sbFByb3BdO1xufVxuXG5mdW5jdGlvbiBnZXRFbGVtZW50QmVoaW5kUG9pbnQgKHBvaW50LCB4LCB5KSB7XG4gIHZhciBwID0gcG9pbnQgfHwge307XG4gIHZhciBzdGF0ZSA9IHAuY2xhc3NOYW1lO1xuICB2YXIgZWw7XG4gIHAuY2xhc3NOYW1lICs9ICcgZ3UtaGlkZSc7XG4gIGVsID0gZG9jLmVsZW1lbnRGcm9tUG9pbnQoeCwgeSk7XG4gIHAuY2xhc3NOYW1lID0gc3RhdGU7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gbmV2ZXIgKCkgeyByZXR1cm4gZmFsc2U7IH1cbmZ1bmN0aW9uIGFsd2F5cyAoKSB7IHJldHVybiB0cnVlOyB9XG5mdW5jdGlvbiBnZXRSZWN0V2lkdGggKHJlY3QpIHsgcmV0dXJuIHJlY3Qud2lkdGggfHwgKHJlY3QucmlnaHQgLSByZWN0LmxlZnQpOyB9XG5mdW5jdGlvbiBnZXRSZWN0SGVpZ2h0IChyZWN0KSB7IHJldHVybiByZWN0LmhlaWdodCB8fCAocmVjdC5ib3R0b20gLSByZWN0LnRvcCk7IH1cbmZ1bmN0aW9uIGdldFBhcmVudCAoZWwpIHsgcmV0dXJuIGVsLnBhcmVudE5vZGUgPT09IGRvYyA/IG51bGwgOiBlbC5wYXJlbnROb2RlOyB9XG5mdW5jdGlvbiBpc0lucHV0IChlbCkgeyByZXR1cm4gZWwudGFnTmFtZSA9PT0gJ0lOUFVUJyB8fCBlbC50YWdOYW1lID09PSAnVEVYVEFSRUEnIHx8IGVsLnRhZ05hbWUgPT09ICdTRUxFQ1QnIHx8IGlzRWRpdGFibGUoZWwpOyB9XG5mdW5jdGlvbiBpc0VkaXRhYmxlIChlbCkge1xuICBpZiAoIWVsKSB7IHJldHVybiBmYWxzZTsgfSAvLyBubyBwYXJlbnRzIHdlcmUgZWRpdGFibGVcbiAgaWYgKGVsLmNvbnRlbnRFZGl0YWJsZSA9PT0gJ2ZhbHNlJykgeyByZXR1cm4gZmFsc2U7IH0gLy8gc3RvcCB0aGUgbG9va3VwXG4gIGlmIChlbC5jb250ZW50RWRpdGFibGUgPT09ICd0cnVlJykgeyByZXR1cm4gdHJ1ZTsgfSAvLyBmb3VuZCBhIGNvbnRlbnRFZGl0YWJsZSBlbGVtZW50IGluIHRoZSBjaGFpblxuICByZXR1cm4gaXNFZGl0YWJsZShnZXRQYXJlbnQoZWwpKTsgLy8gY29udGVudEVkaXRhYmxlIGlzIHNldCB0byAnaW5oZXJpdCdcbn1cblxuZnVuY3Rpb24gbmV4dEVsIChlbCkge1xuICByZXR1cm4gZWwubmV4dEVsZW1lbnRTaWJsaW5nIHx8IG1hbnVhbGx5KCk7XG4gIGZ1bmN0aW9uIG1hbnVhbGx5ICgpIHtcbiAgICB2YXIgc2libGluZyA9IGVsO1xuICAgIGRvIHtcbiAgICAgIHNpYmxpbmcgPSBzaWJsaW5nLm5leHRTaWJsaW5nO1xuICAgIH0gd2hpbGUgKHNpYmxpbmcgJiYgc2libGluZy5ub2RlVHlwZSAhPT0gMSk7XG4gICAgcmV0dXJuIHNpYmxpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RXZlbnRIb3N0IChlKSB7XG4gIC8vIG9uIHRvdWNoZW5kIGV2ZW50LCB3ZSBoYXZlIHRvIHVzZSBgZS5jaGFuZ2VkVG91Y2hlc2BcbiAgLy8gc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzE5MjU2My90b3VjaGVuZC1ldmVudC1wcm9wZXJ0aWVzXG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMzRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGUudGFyZ2V0VG91Y2hlc1swXTtcbiAgfVxuICBpZiAoZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCkge1xuICAgIHJldHVybiBlLmNoYW5nZWRUb3VjaGVzWzBdO1xuICB9XG4gIHJldHVybiBlO1xufVxuXG5mdW5jdGlvbiBnZXRDb29yZCAoY29vcmQsIGUpIHtcbiAgdmFyIGhvc3QgPSBnZXRFdmVudEhvc3QoZSk7XG4gIHZhciBtaXNzTWFwID0ge1xuICAgIHBhZ2VYOiAnY2xpZW50WCcsIC8vIElFOFxuICAgIHBhZ2VZOiAnY2xpZW50WScgLy8gSUU4XG4gIH07XG4gIGlmIChjb29yZCBpbiBtaXNzTWFwICYmICEoY29vcmQgaW4gaG9zdCkgJiYgbWlzc01hcFtjb29yZF0gaW4gaG9zdCkge1xuICAgIGNvb3JkID0gbWlzc01hcFtjb29yZF07XG4gIH1cbiAgcmV0dXJuIGhvc3RbY29vcmRdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRyYWd1bGE7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF0b2EgKGEsIG4pIHsgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGEsIG4pOyB9XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0aWNreSA9IHJlcXVpcmUoJ3RpY2t5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVib3VuY2UgKGZuLCBhcmdzLCBjdHgpIHtcbiAgaWYgKCFmbikgeyByZXR1cm47IH1cbiAgdGlja3koZnVuY3Rpb24gcnVuICgpIHtcbiAgICBmbi5hcHBseShjdHggfHwgbnVsbCwgYXJncyB8fCBbXSk7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGF0b2EgPSByZXF1aXJlKCdhdG9hJyk7XG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW1pdHRlciAodGhpbmcsIG9wdGlvbnMpIHtcbiAgdmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgZXZ0ID0ge307XG4gIGlmICh0aGluZyA9PT0gdW5kZWZpbmVkKSB7IHRoaW5nID0ge307IH1cbiAgdGhpbmcub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICBpZiAoIWV2dFt0eXBlXSkge1xuICAgICAgZXZ0W3R5cGVdID0gW2ZuXTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXZ0W3R5cGVdLnB1c2goZm4pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLm9uY2UgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICBmbi5fb25jZSA9IHRydWU7IC8vIHRoaW5nLm9mZihmbikgc3RpbGwgd29ya3MhXG4gICAgdGhpbmcub24odHlwZSwgZm4pO1xuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmIChjID09PSAxKSB7XG4gICAgICBkZWxldGUgZXZ0W3R5cGVdO1xuICAgIH0gZWxzZSBpZiAoYyA9PT0gMCkge1xuICAgICAgZXZ0ID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBldCA9IGV2dFt0eXBlXTtcbiAgICAgIGlmICghZXQpIHsgcmV0dXJuIHRoaW5nOyB9XG4gICAgICBldC5zcGxpY2UoZXQuaW5kZXhPZihmbiksIDEpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLmVtaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBhdG9hKGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaW5nLmVtaXR0ZXJTbmFwc2hvdChhcmdzLnNoaWZ0KCkpLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xuICB0aGluZy5lbWl0dGVyU25hcHNob3QgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBldCA9IChldnRbdHlwZV0gfHwgW10pLnNsaWNlKDApO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgYXJncyA9IGF0b2EoYXJndW1lbnRzKTtcbiAgICAgIHZhciBjdHggPSB0aGlzIHx8IHRoaW5nO1xuICAgICAgaWYgKHR5cGUgPT09ICdlcnJvcicgJiYgb3B0cy50aHJvd3MgIT09IGZhbHNlICYmICFldC5sZW5ndGgpIHsgdGhyb3cgYXJncy5sZW5ndGggPT09IDEgPyBhcmdzWzBdIDogYXJnczsgfVxuICAgICAgZXQuZm9yRWFjaChmdW5jdGlvbiBlbWl0dGVyIChsaXN0ZW4pIHtcbiAgICAgICAgaWYgKG9wdHMuYXN5bmMpIHsgZGVib3VuY2UobGlzdGVuLCBhcmdzLCBjdHgpOyB9IGVsc2UgeyBsaXN0ZW4uYXBwbHkoY3R4LCBhcmdzKTsgfVxuICAgICAgICBpZiAobGlzdGVuLl9vbmNlKSB7IHRoaW5nLm9mZih0eXBlLCBsaXN0ZW4pOyB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGluZztcbiAgICB9O1xuICB9O1xuICByZXR1cm4gdGhpbmc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3VzdG9tRXZlbnQgPSByZXF1aXJlKCdjdXN0b20tZXZlbnQnKTtcbnZhciBldmVudG1hcCA9IHJlcXVpcmUoJy4vZXZlbnRtYXAnKTtcbnZhciBkb2MgPSBnbG9iYWwuZG9jdW1lbnQ7XG52YXIgYWRkRXZlbnQgPSBhZGRFdmVudEVhc3k7XG52YXIgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEVhc3k7XG52YXIgaGFyZENhY2hlID0gW107XG5cbmlmICghZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgYWRkRXZlbnQgPSBhZGRFdmVudEhhcmQ7XG4gIHJlbW92ZUV2ZW50ID0gcmVtb3ZlRXZlbnRIYXJkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRFdmVudCxcbiAgcmVtb3ZlOiByZW1vdmVFdmVudCxcbiAgZmFicmljYXRlOiBmYWJyaWNhdGVFdmVudFxufTtcblxuZnVuY3Rpb24gYWRkRXZlbnRFYXN5IChlbCwgdHlwZSwgZm4sIGNhcHR1cmluZykge1xuICByZXR1cm4gZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgY2FwdHVyaW5nKTtcbn1cblxuZnVuY3Rpb24gYWRkRXZlbnRIYXJkIChlbCwgdHlwZSwgZm4pIHtcbiAgcmV0dXJuIGVsLmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCB3cmFwKGVsLCB0eXBlLCBmbikpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFdmVudEVhc3kgKGVsLCB0eXBlLCBmbiwgY2FwdHVyaW5nKSB7XG4gIHJldHVybiBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuLCBjYXB0dXJpbmcpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFdmVudEhhcmQgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgbGlzdGVuZXIgPSB1bndyYXAoZWwsIHR5cGUsIGZuKTtcbiAgaWYgKGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIGVsLmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmFicmljYXRlRXZlbnQgKGVsLCB0eXBlLCBtb2RlbCkge1xuICB2YXIgZSA9IGV2ZW50bWFwLmluZGV4T2YodHlwZSkgPT09IC0xID8gbWFrZUN1c3RvbUV2ZW50KCkgOiBtYWtlQ2xhc3NpY0V2ZW50KCk7XG4gIGlmIChlbC5kaXNwYXRjaEV2ZW50KSB7XG4gICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgfSBlbHNlIHtcbiAgICBlbC5maXJlRXZlbnQoJ29uJyArIHR5cGUsIGUpO1xuICB9XG4gIGZ1bmN0aW9uIG1ha2VDbGFzc2ljRXZlbnQgKCkge1xuICAgIHZhciBlO1xuICAgIGlmIChkb2MuY3JlYXRlRXZlbnQpIHtcbiAgICAgIGUgPSBkb2MuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICBlLmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGRvYy5jcmVhdGVFdmVudE9iamVjdCkge1xuICAgICAgZSA9IGRvYy5jcmVhdGVFdmVudE9iamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gZTtcbiAgfVxuICBmdW5jdGlvbiBtYWtlQ3VzdG9tRXZlbnQgKCkge1xuICAgIHJldHVybiBuZXcgY3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWw6IG1vZGVsIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyYXBwZXJGYWN0b3J5IChlbCwgdHlwZSwgZm4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXBwZXIgKG9yaWdpbmFsRXZlbnQpIHtcbiAgICB2YXIgZSA9IG9yaWdpbmFsRXZlbnQgfHwgZ2xvYmFsLmV2ZW50O1xuICAgIGUudGFyZ2V0ID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgIGUucHJldmVudERlZmF1bHQgPSBlLnByZXZlbnREZWZhdWx0IHx8IGZ1bmN0aW9uIHByZXZlbnREZWZhdWx0ICgpIHsgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlOyB9O1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uID0gZS5zdG9wUHJvcGFnYXRpb24gfHwgZnVuY3Rpb24gc3RvcFByb3BhZ2F0aW9uICgpIHsgZS5jYW5jZWxCdWJibGUgPSB0cnVlOyB9O1xuICAgIGUud2hpY2ggPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcbiAgICBmbi5jYWxsKGVsLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gd3JhcCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciB3cmFwcGVyID0gdW53cmFwKGVsLCB0eXBlLCBmbikgfHwgd3JhcHBlckZhY3RvcnkoZWwsIHR5cGUsIGZuKTtcbiAgaGFyZENhY2hlLnB1c2goe1xuICAgIHdyYXBwZXI6IHdyYXBwZXIsXG4gICAgZWxlbWVudDogZWwsXG4gICAgdHlwZTogdHlwZSxcbiAgICBmbjogZm5cbiAgfSk7XG4gIHJldHVybiB3cmFwcGVyO1xufVxuXG5mdW5jdGlvbiB1bndyYXAgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgaSA9IGZpbmQoZWwsIHR5cGUsIGZuKTtcbiAgaWYgKGkpIHtcbiAgICB2YXIgd3JhcHBlciA9IGhhcmRDYWNoZVtpXS53cmFwcGVyO1xuICAgIGhhcmRDYWNoZS5zcGxpY2UoaSwgMSk7IC8vIGZyZWUgdXAgYSB0YWQgb2YgbWVtb3J5XG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBpLCBpdGVtO1xuICBmb3IgKGkgPSAwOyBpIDwgaGFyZENhY2hlLmxlbmd0aDsgaSsrKSB7XG4gICAgaXRlbSA9IGhhcmRDYWNoZVtpXTtcbiAgICBpZiAoaXRlbS5lbGVtZW50ID09PSBlbCAmJiBpdGVtLnR5cGUgPT09IHR5cGUgJiYgaXRlbS5mbiA9PT0gZm4pIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXZlbnRtYXAgPSBbXTtcbnZhciBldmVudG5hbWUgPSAnJztcbnZhciByb24gPSAvXm9uLztcblxuZm9yIChldmVudG5hbWUgaW4gZ2xvYmFsKSB7XG4gIGlmIChyb24udGVzdChldmVudG5hbWUpKSB7XG4gICAgZXZlbnRtYXAucHVzaChldmVudG5hbWUuc2xpY2UoMikpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXZlbnRtYXA7XG4iLCJcbnZhciBOYXRpdmVDdXN0b21FdmVudCA9IGdsb2JhbC5DdXN0b21FdmVudDtcblxuZnVuY3Rpb24gdXNlTmF0aXZlICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgcCA9IG5ldyBOYXRpdmVDdXN0b21FdmVudCgnY2F0JywgeyBkZXRhaWw6IHsgZm9vOiAnYmFyJyB9IH0pO1xuICAgIHJldHVybiAgJ2NhdCcgPT09IHAudHlwZSAmJiAnYmFyJyA9PT0gcC5kZXRhaWwuZm9vO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyb3NzLWJyb3dzZXIgYEN1c3RvbUV2ZW50YCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnRcbiAqXG4gKiBAcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB1c2VOYXRpdmUoKSA/IE5hdGl2ZUN1c3RvbUV2ZW50IDpcblxuLy8gSUUgPj0gOVxuJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50ID8gZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICBpZiAocGFyYW1zKSB7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgfSBlbHNlIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UsIHZvaWQgMCk7XG4gIH1cbiAgcmV0dXJuIGU7XG59IDpcblxuLy8gSUUgPD0gOFxuZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gIGUudHlwZSA9IHR5cGU7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmJ1YmJsZXMgPSBCb29sZWFuKHBhcmFtcy5idWJibGVzKTtcbiAgICBlLmNhbmNlbGFibGUgPSBCb29sZWFuKHBhcmFtcy5jYW5jZWxhYmxlKTtcbiAgICBlLmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gIH0gZWxzZSB7XG4gICAgZS5idWJibGVzID0gZmFsc2U7XG4gICAgZS5jYW5jZWxhYmxlID0gZmFsc2U7XG4gICAgZS5kZXRhaWwgPSB2b2lkIDA7XG4gIH1cbiAgcmV0dXJuIGU7XG59XG4iLCJ2YXIgc2kgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nLCB0aWNrO1xuaWYgKHNpKSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0SW1tZWRpYXRlKGZuKTsgfTtcbn0gZWxzZSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0VGltZW91dChmbiwgMCk7IH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGljazsiLCIoZnVuY3Rpb24gKCQsIERydXBhbCwgZHJ1cGFsU2V0dGluZ3MsIENLRURJVE9SKSB7XG5cbiAgRHJ1cGFsLmJlaGF2aW9ycy5kcmFnZ2FibGVJdGVtcyA9IHtcbiAgICBhdHRhY2g6IGZ1bmN0aW9uIChjb250ZXh0LCBzZXR0aW5ncykge1xuXG4gICAgICAkKCcuZHJhZ2dhYmxlLWl0ZW1zLWNvbnRhaW5lcicpLmVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2RyYWd1bGEtcHJvY2Vzc2VkJykpIHtcbiAgICAgICAgICBpbml0RHJhZ2dhYmxlSXRlbXMoJCh0aGlzKSk7XG4gICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcygnZHJhZ3VsYS1wcm9jZXNzZWQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB9XG4gIH07XG5cbiAgLy8gTWFrZSBzdXJlIHRoaXMgV0FTIGEgd3lzaXd5ZyBpbml0aWFsbHksIG5vdCBhbnkgdGV4dGFyZWEsIG1heWJlIHNlbGVjdG9ycyBvciBzb21ldGhpbmdcbiAgZnVuY3Rpb24gaW5pdENrZWRpdG9yRnJvbVNhdmVkU3RhdHVzKGVsLCBkcmFnZ2VkSXRlbXMpIHtcbiAgICAkLmVhY2goZHJhZ2dlZEl0ZW1zLCBmdW5jdGlvbihpLCB2YWx1ZSkge1xuICAgICAgaWYgKCQoZWwpLmZpbmQoJyMnK3ZhbHVlLmlkKS5sZW5ndGggJiYgdmFsdWUuY29uZmlnKSB7XG4gICAgICAgIHZhciBuZXdFZGl0b3IgPSBDS0VESVRPUi5yZXBsYWNlKHZhbHVlLmlkLCB2YWx1ZS5jb25maWcpO1xuICAgICAgICBuZXdFZGl0b3Iub24oJ2luc3RhbmNlUmVhZHknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdFZGl0b3Iuc2V0RGF0YSh2YWx1ZS5jb250ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0RHJhZ2dhYmxlSXRlbXMoJGRyYWdnYWJsZUl0ZW1Db250YWluZXJzKSB7XG4gICAgLy8gRGVjbGFyZSB2YXJpYWJsZXMgZm9yIHRoZSBjdXJyZW50bHkgZHJhZ2dlZCBpdGVtIHNvIHRoZXkgY2FuIGJlIGFjY2Vzc2VkIGluIGFueSBldmVuIGhhbmRsZXJcbiAgICB2YXIgZHJhZ2dlZEl0ZW1zID0gW107XG5cbiAgICAvLyBJbml0aWFsaXplIGRyYWd1bGEgb24gZHJhZ2dhYmxlIGNvbnRhaW5lcnNcbiAgICB2YXIgZHJha2UgPSBkcmFndWxhKFskZHJhZ2dhYmxlSXRlbUNvbnRhaW5lcnNbMF1dLCB7XG4gICAgICAvLyBPbmx5IGhhbmRsZSBkcmFncyBpdGVtc1xuICAgICAgbW92ZXM6IGZ1bmN0aW9uIChlbCwgY29udGFpbmVyLCBoYW5kbGUpIHtcbiAgICAgICAgcmV0dXJuICQoZWwpLmNoaWxkcmVuKCcuZHJhZ3VsYS1oYW5kbGUnKVswXSA9PT0gJChoYW5kbGUpWzBdO1xuICAgICAgfSxcbiAgICAgIC8vIERyb3AgY2FuIG9ubHkgaGFwcGVuIGluIHNvdXJjZSBlbGVtZW50XG4gICAgICBhY2NlcHRzOiBmdW5jdGlvbiAoZWwsIHRhcmdldCwgc291cmNlLCBzaWJsaW5nKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQgPT09IHNvdXJjZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE9uIGRyb3Agd2UgbmVlZCB0byByZWNyZWF0ZSB0aGUgZWRpdG9yIGZyb20gc2F2ZWQgY29uZmlnXG4gICAgZHJha2Uub24oJ2Ryb3AnLCBmdW5jdGlvbihlbCwgdGFyZ2V0LCBzb3VyY2UsIHNpYmxpbmcpIHtcbiAgICAgIGFkanVzdE9yZGVyKGRyYWtlKTtcbiAgICAgIGluaXRDa2VkaXRvckZyb21TYXZlZFN0YXR1cyhlbCwgZHJhZ2dlZEl0ZW1zKTtcbiAgICB9KTtcblxuICAgIC8vIE9uIGNhbmNlbCB3ZSBuZWVkIHRvIHJlY3JlYXRlIHRoZSBlZGl0b3IgZnJvbSBzYXZlZCBjb25maWdcbiAgICBkcmFrZS5vbignY2FuY2VsJywgZnVuY3Rpb24oZWwsIGNvbnRhaW5lciwgc291cmNlKSB7XG4gICAgICBpbml0Q2tlZGl0b3JGcm9tU2F2ZWRTdGF0dXMoZWwsIGRyYWdnZWRJdGVtcyk7XG4gICAgfSk7XG5cbiAgICAvLyBPbiBkcmFnIHN0YXJ0IHdlIG5lZWQgdG8gc2F2ZSB0aGUgY29uZmlnIGZyb20gdGhlIGNrZWRpdG9yIGluc3RhbmNlIGFuZCBkZXN0cm95IGl0XG4gICAgZHJha2Uub24oJ2RyYWcnLCBmdW5jdGlvbihlbCwgc291cmNlKSB7XG4gICAgICAvLyBPbiBkcmFnIHN0YXJ0LCByZXNldCB0aGUgYXJyYXkgdG8gZW1wdHkgc28geW91IGRvbid0IHRyeSB0byBpbml0aWFsaXplIHRoZSBzYW1lIGVsZW1lbnQgbXVsdGlwbGUgdGltZXNcbiAgICAgIGRyYWdnZWRJdGVtcyA9IFtdO1xuICAgICAgLy8gR2V0IGlkIGZyb20gdGV4dGFyZWFcbiAgICAgIHZhciAkd3lzaXd5Z3MgPSAkKGVsKS5maW5kKCcuY2tlJykuc2libGluZ3MoJ3RleHRhcmVhJyk7XG4gICAgICAkd3lzaXd5Z3MuZWFjaChmdW5jdGlvbihpLCBlbCkge1xuICAgICAgICB2YXIgZHJhZ2dlZEl0ZW1JZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKENLRURJVE9SLmluc3RhbmNlc1tkcmFnZ2VkSXRlbUlkXSkge1xuICAgICAgICAgIHZhciBkcmFnZ2VkSXRlbUluc3RhbmNlID0gQ0tFRElUT1IuaW5zdGFuY2VzW2RyYWdnZWRJdGVtSWRdO1xuICAgICAgICAgIHZhciBkcmFnZ2VkSXRlbUNvbmZpZyA9IGRyYWdnZWRJdGVtSW5zdGFuY2UuY29uZmlnO1xuICAgICAgICAgIHZhciBkcmFnZ2VkSXRlbUNvbnRlbnQgPSBkcmFnZ2VkSXRlbUluc3RhbmNlLmdldERhdGEoKTtcbiAgICAgICAgICBkcmFnZ2VkSXRlbXMucHVzaCh7XG4gICAgICAgICAgICBpZDogZHJhZ2dlZEl0ZW1JZCxcbiAgICAgICAgICAgIGluc3RhbmNlOiBkcmFnZ2VkSXRlbUluc3RhbmNlLFxuICAgICAgICAgICAgY29uZmlnOiBkcmFnZ2VkSXRlbUNvbmZpZyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IGRyYWdnZWRJdGVtQ29udGVudFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChkcmFnZ2VkSXRlbUluc3RhbmNlKSB7IGRyYWdnZWRJdGVtSW5zdGFuY2UuZGVzdHJveSh0cnVlKTsgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIEluaXQgZG9tLWF1dG9zY3JvbGxlciBmb3IgZWFjaCBkcmFrZSBpbnN0YW5jZVxuICAgIHZhciBzY3JvbGwgPSBhdXRvU2Nyb2xsKFtcbiAgICAgIHdpbmRvd1xuICAgIF0se1xuICAgICAgbWFyZ2luOiA3MCxcbiAgICAgIG1heFNwZWVkOiAxNCxcbiAgICAgIGF1dG9TY3JvbGw6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmRvd24gJiYgZHJha2UuZHJhZ2dpbmc7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGp1c3RPcmRlcihkcmFndWxhT2JqZWN0KSB7XG4gICAgdmFyICRkcmFnZ2FibGVJdGVtcyA9ICQoZHJhZ3VsYU9iamVjdC5jb250YWluZXJzWzBdKS5jaGlsZHJlbigpO1xuICAgICRkcmFnZ2FibGVJdGVtcy5lYWNoKGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICAvLyBCZWNhdXNlIGRydXBhbCBoYXMgbm8gdXNlZnVsIHNlbGVjdG9ycyBvbiB0aGUgYWRtaW4gc2lkZSBhbmQgYWRkcyB3cmFwcGVycyBmb3IgbmV3bHkgY3JlYXRlZCBwYXJhZ3JhcGhzLFxuICAgICAgLy8gd2UgbmVlZCB0byBkbyB0aGlzIGhhbmt5IHBhbmt5IHRvIG1ha2Ugc3VyZSB3ZSBhcmUgb25seSBhZGp1c3RpbmcgdGhlIHdlaWdodHMgb2YgdGhlIGN1cnJlbnRseSBhZGp1c3RlZCBpdGVtc1xuICAgICAgdmFyICR3ZWlnaHRTZWxlY3QgPSAkKHRoaXMpLmNoaWxkcmVuKCdkaXYnKS5jaGlsZHJlbignZGl2JykuY2hpbGRyZW4oJy5mb3JtLXR5cGUtc2VsZWN0JykuY2hpbGRyZW4oJ3NlbGVjdCcpLFxuICAgICAgICAgICR3ZWlnaHRTZWxlY3RBamF4ID0gJCh0aGlzKS5jaGlsZHJlbignLmFqYXgtbmV3LWNvbnRlbnQnKS5jaGlsZHJlbignZGl2JykuY2hpbGRyZW4oJ2RpdicpLmNoaWxkcmVuKCcuZm9ybS10eXBlLXNlbGVjdCcpLmNoaWxkcmVuKCdzZWxlY3QnKTtcbiAgICAgIGlmICgkd2VpZ2h0U2VsZWN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHdlaWdodFNlbGVjdC52YWwoaSk7XG4gICAgICB9IGVsc2UgaWYgKCR3ZWlnaHRTZWxlY3RBamF4Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHdlaWdodFNlbGVjdEFqYXgudmFsKGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiBDYW5ub3QgZmluZCB2YWxpZCBwYXJhZ3JhcGggd2VpZ2h0IHRvIGFkanVzdCEnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG59KShqUXVlcnksIERydXBhbCwgZHJ1cGFsU2V0dGluZ3MsIENLRURJVE9SKTsiLCIvKipcbiAqIEBmaWxlIGVudGl0eS1icm93c2VyLWltcHJvdmVtZW50cy5qc1xuICpcbiAqIEFkZHMgZXh0cmEgVUkgaW1wcm92ZW1lbnRzIHRvIGFsbCBlbnRpdHkgYnJvd3NlcnMgaW4gdGhlIGFkbWluIHRoZW1lLlxuICovXG5cbiFmdW5jdGlvbigkKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgRHJ1cGFsLmJlaGF2aW9ycy5lbnRpdHlCcm93c2VySW1wcm92ZXIgPSB7XG4gICAgYXR0YWNoOiBmdW5jdGlvbihjb250ZXh0LCBzZXR0aW5ncykge1xuICAgICAgLy8gQWRkIC52aWV3LWVudGl0eS1icm93c2VyLUJST1dTRVItTkFNRSB0byB0aGlzIGxpc3QgZm9yIGJyb3dzZXJzIHlvdSB3YW50IHRvIGFkZCB0aGUgY2xpY2sgaXRlbSBmdW5jdGlvbmFsaXR5XG4gICAgICBsZXQgJGJyb3dzZXJTZWxlY3RvcnMgPSBbXG4gICAgICAgICcudmlldy1lbnRpdHktYnJvd3Nlci1pbWFnZScsXG4gICAgICAgICcudmlldy1lbnRpdHktYnJvd3Nlci12aWRlbycsXG4gICAgICAgICcudmlldy1lbnRpdHktYnJvd3Nlci1zdmcnXG4gICAgICBdO1xuXG4gICAgICBsZXQgJGJyb3dzZXJDb2wgPSAkKCRicm93c2VyU2VsZWN0b3JzLmpvaW4oJywgJyksIGNvbnRleHQpLmZpbmQoJy52aWV3cy1yb3cnKTtcblxuICAgICAgJGJyb3dzZXJDb2wuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0ICRjb2wgPSAkKHRoaXMpO1xuXG4gICAgICAgIGlmICgkY29sLmhhc0NsYXNzKCdlbnRpdHktYnJvd3Nlci1pbXByb3Zlci1wcm9jZXNzZWQnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkY29sLmFkZENsYXNzKCdlbnRpdHktYnJvd3Nlci1pbXByb3Zlci1wcm9jZXNzZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkY29sLmhhc0NsYXNzKCdjb2x1bW4tc2VsZWN0ZWQnKSkge1xuICAgICAgICAgIHVuY2hlY2tDb2x1bW4oJGNvbCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGJyb3dzZXJDb2wuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICB1bmNoZWNrQ29sdW1uKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjaGVja0NvbHVtbigkY29sKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiB1bmNoZWNrQ29sdW1uKCR0YXJnZXQpIHtcbiAgICAkdGFyZ2V0LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLnByb3AoXCJjaGVja2VkXCIsIGZhbHNlKTtcbiAgICAkdGFyZ2V0LnJlbW92ZUNsYXNzKCdjb2x1bW4tc2VsZWN0ZWQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrQ29sdW1uKCR0YXJnZXQpIHtcbiAgICAkdGFyZ2V0LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLnByb3AoXCJjaGVja2VkXCIsIHRydWUpO1xuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2NvbHVtbi1zZWxlY3RlZCcpO1xuICB9XG59KGpRdWVyeSk7IiwiLyoqXG4gKiBwYXJhZ3JhcGhzLWltcHJvdmVtZW50cy5qc1xuICogSW1wcm92ZSB0aGUgcGFyYWdyYXBocyBhZG1pbiB1aVxuICovXG5cbiFmdW5jdGlvbigkKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgRHJ1cGFsLmJlaGF2aW9ycy5wYXJhZ3JhcGhzUHJldmlld2VySW1wcm92ZXIgPSB7XG4gICAgYXR0YWNoOiBmdW5jdGlvbihjb250ZXh0LCBzZXR0aW5ncykge1xuICAgICAgdmFyICRwcmV2aWV3ZXJCdXR0b25zID0gJCgnLmxpbmsucGFyYWdyYXBocy1wcmV2aWV3ZXInLCBjb250ZXh0KTtcblxuICAgICAgJHByZXZpZXdlckJ1dHRvbnMuZWFjaCgoaSwgZWwpID0+IHtcbiAgICAgICAgdmFyICRwcmV2aWV3ZXJCdXR0b24gPSAkKGVsKTtcbiAgICAgICAgcmVwbGFjZVBhcmFncmFwaE5hbWUoJHByZXZpZXdlckJ1dHRvbik7XG4gICAgICB9KTtcblxuICAgICAgLy8gR2V0IHBhcmFncmFwaHMgcHJldmlld3MgYnkgb25seSB0YXJnZXRpbmcgb25lcyB3aXRoIHRoZSAucGFyYWdyYXBoLXR5cGUtdG9wIGFzIGEgc2libGluZ1xuICAgICAgLy8gc28gbmVzdGVkIHBhcmFncmFwaHMgcHJldmlld3MgZG9uJ3QgYnJlYWtcbiAgICAgIHZhciAkcGFyYWdyYXBoc1RvcEVsZW1lbnRzID0gJCgnLnBhcmFncmFwaC10eXBlLXRvcCcsIGNvbnRleHQpO1xuICAgICAgdmFyICRwYXJhZ3JhcGhzUHJldmlld3MgPSAkcGFyYWdyYXBoc1RvcEVsZW1lbnRzLnNpYmxpbmdzKCcucGFyYWdyYXBoLS12aWV3LW1vZGUtLXByZXZpZXcnKTtcblxuICAgICAgZm9ybWF0UGFyYWdyYXBoc1ByZXZpZXdzKCRwYXJhZ3JhcGhzUHJldmlld3MpO1xuXG4gICAgICAvLyBOZWNlc3NhcnkgZm9yIHBhcmFncmFwaHMgcHJldmlld3MgYmVoaW5kIHRhYnNcbiAgICAgICQoJy52ZXJ0aWNhbC10YWJzX19tZW51IGEnKS5vbihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgZm9ybWF0UGFyYWdyYXBoc1ByZXZpZXdzKCRwYXJhZ3JhcGhzUHJldmlld3MpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIERydXBhbC5iZWhhdmlvcnMucGFyYWdyYXBoc0hlbHBlckNsYXNzZXMgPSB7XG4gICAgYXR0YWNoOiBmdW5jdGlvbihjb250ZXh0LCBzZXR0aW5ncykge1xuICAgICAgdmFyICRjb25maXJtUmVtb3ZlQnV0dG9ucyA9ICQoJy5jb25maXJtLXJlbW92ZScpO1xuXG4gICAgICAkY29uZmlybVJlbW92ZUJ1dHRvbnMuZWFjaChmdW5jdGlvbihpLCBlbCkge1xuICAgICAgICAkKGVsKS5jbG9zZXN0KCcuYWRtaW4tcGFyYWdyYXBocy1kcmFnZ2FibGUtaXRlbSwgLmFkbWluLXBhcmFncmFwaHMtc2luZ2xlJykuYWRkQ2xhc3MoJ3BhcmFncmFwaC1jb25maXJtLWRlbGV0ZScpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIEJlY2F1c2UgZHJ1cGFsIGJlaGF2aW9ycyBhcmUgc28gYW5ub3lpbmcsIGFkZCBkZWxlZ2F0ZWQgY2xpY2sgaGFuZGxlciBoZXJlLCBjb3VsZG4ndCBnZXQgaXQgdG8gd29yayBwcm9wZXJseVxuICAvLyBpbnNpZGUgdGhlIGJlaGF2aW9yXG4gICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnLnBhcmFncmFwaC0tdmlldy1tb2RlLS1wcmV2aWV3JywgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKCdleHBhbmRlZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICAvKipcbiAgICogQWRkIHRoZSB0eXBlIHRvIHRoZSBwcmV2aWV3ZXIgYnV0dG9uIGlmIHlvdSB3YW50XG4gICAqIEBwYXJhbSBwcmV2aWV3ZXJCdXR0b25cbiAgICovXG4gIGZ1bmN0aW9uIHJlcGxhY2VQYXJhZ3JhcGhOYW1lKHByZXZpZXdlckJ1dHRvbikge1xuICAgIHZhciBwYXJhZ3JhcGhOYW1lID0gcHJldmlld2VyQnV0dG9uLnNpYmxpbmdzKCcucGFyYWdyYXBoLXR5cGUtdGl0bGUnKS50ZXh0KCk7XG4gICAgcHJldmlld2VyQnV0dG9uLnZhbChgUHJldmlldzogJHtwYXJhZ3JhcGhOYW1lfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCB0aGUgcHJldmlld3MgdG8gYmUgZXhwYW5kYWJsZVxuICAgKiBAcGFyYW0gcGFyYWdyYXBoc1ByZXZpZXdzXG4gICAqL1xuICBmdW5jdGlvbiBmb3JtYXRQYXJhZ3JhcGhzUHJldmlld3MocGFyYWdyYXBoc1ByZXZpZXdzKSB7XG4gICAgcGFyYWdyYXBoc1ByZXZpZXdzLmVhY2goKGksIGVsKSA9PiB7XG4gICAgICB2YXIgJHRoaXMgPSAkKGVsKTtcbiAgICAgIGlmICgkdGhpcy5vdXRlckhlaWdodCgpID49IDEwMCkge1xuICAgICAgICAkdGhpcy5hZGRDbGFzcygnZXhwYW5kYWJsZScpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn0oalF1ZXJ5KTsiLCIvKipcbiAqIEBmaWxlIGluamVjdC1zdmcuanNcbiAqXG4gKiBVc2Ugc3ZnLWluamVjdG9yLmpzIHRvIHJlcGxhY2UgYW4gc3ZnIDxpbWc+IHRhZyB3aXRoIHRoZSBpbmxpbmUgc3ZnLlxuICovXG5cbiFmdW5jdGlvbigkKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgJChmdW5jdGlvbigpIHtcbiAgICAvLyBFbGVtZW50cyB0byBpbmplY3RcbiAgICBsZXQgbXlTVkdzVG9JbmplY3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdpbWcuaW5qZWN0LW1lJyk7XG5cbiAgICAvLyBEbyB0aGUgaW5qZWN0aW9uXG4gICAgU1ZHSW5qZWN0b3IobXlTVkdzVG9JbmplY3QpO1xuICB9KTtcblxufShqUXVlcnkpOyJdfQ==
