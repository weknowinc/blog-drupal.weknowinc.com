<?php
function weknow_blog_form_system_theme_settings_alter(&$form, \Drupal\Core\Form\FormStateInterface &$form_state, $form_id = NULL)
{
    /**
     * Implements hook_theme_form_system_theme_settings_alter().
     */
    $form['weknow_blog_settings']['intro'] = array(
        '#type' => 'details',
        '#title' => t('Intro'),
        '#description' => t('Configuration for intro on homepage.'),
        '#open' => TRUE, // Controls the HTML5 'open' attribute. Defaults to FALSE.
    );

    $form['weknow_blog_settings']['intro']['intro_logo'] = array(
        '#type' => 'textfield',
        '#title' => t('Path to custom logo for intro'),
        '#default_value' => theme_get_setting('intro_logo', 'weknow_blog'),
        '#description' => t("Examples: <code>logo.svg</code> (for a file in the public filesystem), <code>public://logo.svg</code>, or <code>themes/custom/weknow_blog/logo.svg</code>."),
    );

    $form['weknow_blog_settings']['intro']['quotes'] = array(
        '#type' => 'textfield',
        '#title' => t('Quotes Intro'),
        '#default_value' => theme_get_setting('quotes', 'weknow_blog'),
        '#description' => t("Please provide the quotes for the intro separated by commas (i.e Consulting, Theming, Development)."),
    );

    $form['weknow_blog_settings']['footer'] = array(
        '#type' => 'details',
        '#title' => t('Footer'),
        '#description' => t('Configuration for footer.'),
        '#open' => TRUE, // Controls the HTML5 'open' attribute. Defaults to FALSE.
    );

    $form['weknow_blog_settings']['footer']['footer_logo'] = array(
        '#type' => 'textfield',
        '#title' => t('Path to custom logo for intro'),
        '#default_value' => theme_get_setting('footer_logo', 'weknow_blog'),
        '#description' => t("Examples: <code>logo.svg</code> (for a file in the public filesystem), <code>public://logo.svg</code>, or <code>themes/custom/weknow_blog/logo.svg</code>."),
    );

    $form['weknow_blog_settings']['footer']['copyright'] = array(
        '#type' => 'textfield',
        '#title' => t('Copyright'),
        '#default_value' => theme_get_setting('copyright', 'weknow_blog'),
        '#description' => t("Examples: Copyright weKnow 2017"),
    );

    $form['weknow_blog_settings']['footer']['facebook_link'] = array(
        '#type' => 'url',
        '#title' => t('Facebook'),
        '#default_value' => theme_get_setting('facebook_link', 'weknow_blog'),
        '#description' => t("Please provide link of Facebook site"),
    );

    $form['weknow_blog_settings']['footer']['twitter_link'] = array(
        '#type' => 'url',
        '#title' => t('Twitter'),
        '#default_value' => theme_get_setting('twitter_link', 'weknow_blog'),
        '#description' => t("Please provide link of Twitter site"),
    );

    $form['weknow_blog_settings']['phones'] = array(
        '#type' => 'details',
        '#title' => t('Contact Phones'),
        '#description' => t('Please provide contact phones'),
        '#open' => TRUE, // Controls the HTML5 'open' attribute. Defaults to FALSE.
    );

    $form['weknow_blog_settings']['phones']['us_phone'] = array(
        '#type' => 'tel',
        '#title' => t('US Phone'),
        '#default_value' => theme_get_setting('us_phone', 'weknow_blog'),
    );
    $form['weknow_blog_settings']['phones']['cr_phone'] = array(
        '#type' => 'tel',
        '#title' => t('CR Phone'),
        '#default_value' => theme_get_setting('cr_phone', 'weknow_blog'),
    );
    $form['weknow_blog_settings']['phones']['mx_phone'] = array(
        '#type' => 'tel',
        '#title' => t('MX Phone'),
        '#default_value' => theme_get_setting('mx_phone', 'weknow_blog'),
    );
    $form['weknow_blog_settings']['phones']['au_phone'] = array(
        '#type' => 'tel',
        '#title' => t('AU Phone'),
        '#default_value' => theme_get_setting('au_phone', 'weknow_blog'),
    );

}
