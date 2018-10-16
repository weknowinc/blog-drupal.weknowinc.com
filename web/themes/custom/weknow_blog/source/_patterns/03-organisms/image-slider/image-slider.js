(function imagesliderScript($, Drupal) {
  Drupal.behaviors.imageslider = {
    attach(context) {
      $('.image-slider').slick({
        autoplay: true,
        dots: true,
        arrows: false,
        adaptiveHeight: true,
        autoplaySpeed: 8000,
      });
    },
  };
}(jQuery, Drupal));
