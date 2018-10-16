(function navbarScript($, Drupal) {
  Drupal.behaviors.navbar = {
    attach() {
      $(window).bind('scroll', () => {
        if ($(window).scrollTop() > 25) {
          $('.js-navbar__menu-container').addClass('show');
          $('.js-site__header').addClass('scrolled');
          $('.js-navbar').addClass('scrolled');
        } else {
          if ($(window).width() > 700) {
            $('.js-navbar__menu-container').addClass('show');
          } else {
            $('.js-navbar__menu-container').removeClass('show');
          }
          $('.js-site__header').removeClass('scrolled');
          $('.js-navbar').removeClass('scrolled');
        }
      });

      $(window).bind('resize', () => $(window).trigger('scroll'));

      $(document).ready(() => {
        $('.js-navbar__menu-icon').bind('click', () => {
          $('.js-sidebar').toggleClass('slideOn');
          $('.js-site__left').toggleClass('slideOn');
        });
        const $navbarContainerClone = $('.js-navbar__menu-container').clone();
        $navbarContainerClone
          .removeClass('navbar__menu-container')
          .removeClass('js-navbar__menu-container')
          .addClass('sidebar__navbar__menu-container')
          .addClass('js-sidebar__navbar__menu-container')
          .show();
        $('.js-sidebar__container').append($navbarContainerClone);
      });
    },
  };
}(jQuery, Drupal));
