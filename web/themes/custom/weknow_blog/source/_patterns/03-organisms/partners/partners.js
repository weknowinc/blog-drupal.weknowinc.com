(function partnersScript($, Drupal) {
  Drupal.behaviors.partners = {
    attach(context) {
      $('.partners__content').slick({
        mobileFirst: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        dots: false,
        arrows: false,
        adaptiveHeight: true,
        speed: 500,
        responsive: [
          {
            breakpoint: 1100,
            settings: {
              slidesToShow: 6,
              slidesToScroll: 1
            }
          },
          {
            breakpoint: 400,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1
            }
          },
        ]
      });
    },
  };
}(jQuery, Drupal));
