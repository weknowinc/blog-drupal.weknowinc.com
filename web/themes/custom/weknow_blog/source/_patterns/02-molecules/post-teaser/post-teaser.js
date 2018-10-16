(function imagesliderScript($, Drupal) {
  Drupal.behaviors.postTeaser = {
    attach() {
      $('.post-teaser__slider').slick({
        autoplay: true,
        dots: false,
        arrows: true,
        adaptiveHeight: true,
        speed: 500,
      });
    },
  };
}(jQuery, Drupal));
