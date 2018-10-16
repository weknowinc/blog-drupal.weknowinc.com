(function sidebarScript($, Drupal) {
  Drupal.behaviors.sidebar = {
    attach() {
      $(window).bind('scroll', () => {
        if ($(window).scrollTop() < 25 && $(window).width() > 700) {
          $('.js-sidebar').removeClass('slideOn');
          $('.js-site__left').removeClass('slideOn');
        }
      });

      $(document).ready(() => {
        $('.js-sidebar__close-icon').bind('click', () => {
          $('.js-sidebar').toggleClass('slideOn');
          $('.js-site__left').toggleClass('slideOn');
        });
      });
    },
  };
}(jQuery, Drupal));
