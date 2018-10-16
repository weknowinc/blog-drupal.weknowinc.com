(function rotatingquotationScript($, Drupal) {
  Drupal.behaviors.rotatingquotation = {
    attach(context) {
      $('.rotating-quotation').slick({
        autoplay: true,
        fade: true,
        dots: false,
        arrows: false,
        adaptiveHeight: true,
        speed: 500,
      });
    },
  };
}(jQuery, Drupal));
