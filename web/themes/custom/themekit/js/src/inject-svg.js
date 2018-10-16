/**
 * @file inject-svg.js
 *
 * Use svg-injector.js to replace an svg <img> tag with the inline svg.
 */
import $ from 'jquery';
import 'svg.js';

// This test is for ie11 and lower, but not edge.
let supportsResponsiveInlineSvg = Modernizr.cssfilters;

// Elements to inject
let $mySVGsToInject = $('img.inject-me');

$mySVGsToInject.each(function(i, el) {
  const $element = $(this),
        $parent = $element.parent(),
        url = $element.attr('src');

  $element.remove();

  $parent.load(url + ' svg', function(response, status) {
    if (status === 'success') {
      const $svgContainer = $(this),
            svgDomElement = $svgContainer.children().get(0);

      // Adopt the svg element into svg.js context and set as `element` for future use.
      const element = SVG.adopt(svgDomElement),
            svgRoot = SVG.select('svg');

      // Remove height and width attributes from the svg element.
      svgRoot.attr({
        width: null,
        height: null
      });

      // For ie11 which supports svg, but has lots of issues with sizing, we
      // need to use the padding hack, and will calculate the % for each item based
      // on the viewBox. So svg should have a viewBox, if not, a default of 100%
      // will be used. This will give a reasonable fallback in most cases. There
      // is also corresponded css for ie11 targeting the `no-cssfilters` class.
      if (!supportsResponsiveInlineSvg) {
        const viewbox = element.viewbox();

        if (viewbox) {
          element.viewbox().height = 200;

          const percentage = Math.ceil(viewbox.height/viewbox.width * 100) + '%';
          $parent.css('padding-top', percentage);
        }
      }
    }
  });
});
