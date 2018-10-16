---
layout: post
title: "Form altering will not be the same in Drupal 8 after using Webprofiler"
categories: [Articles]
tags: [Drupal 8,Drupal,PHP, Form, Webprofiler]
---
One of the most common tasks as a Drupal developer is alter a form created by Drupal core of by a contrib module to 
enable us to include our business logic or  just remove something annoying for our clients.

In Drupal 8 we still have to the hook [hook_form_alter](https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Form%21form.api.php/function/hook_form_alter/8), I know, I know the whole idea of Drupal 8 is to remove hooks, but we still have some of them around.

But, this article is not about to discuss that hook must exist or not, Is there and we have to use until is replaced by something else.

Doing a form alter require a one significant and vital information the **FORM_ID**. Usually, we can get this information implementing a generic form alter and print all form_ids loaded and choose the desired one, or, check in form source code to verify the id in method **getFormId** as you can see in the following method

```
  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'search_block_form';
  }

```

That doesn't look like an old fashion way? indeed, it's the old fashion way. Drupal 8 allow us to have excellent third party tools, and I want to talk about [Webprofiler](https://www.drupal.org/project/devel), which in combination with the [Drupal Console](http://drupalcosole.com) project, provide us a clever way to determine and generate our form alter, fast and efficient.

[Lussoluca](https://www.drupal.org/u/lussoluca) created the webprofiler module, and is an effective implementation of [Symfony profiler](http://symfony.com/doc/current/cookbook/profiler/index.html), using this component to write and extension to provide the Drupal things that Symfony profiler ignore. Webprofiler start as an independent project at [https://www.drupal.org/project/webprofiler](https://www.drupal.org/project/webprofiler), but the last December was merged as a submodule of Devel module; honestly I don't understand because there is not any technical dependency, IMHO webprofiler must have an independent project.

#Generate a standard form alter.

Anyhow, let me show you how to generate a form alter using the **Drupal Console** without **Webprofiler**. 

Using the command **generate:form:alter** we could generate an implementation of hook hoo_form_alter in any desired module, let show you who to execute this command avoiding interactive mode

```
$ drupal generate:form:alter  --module="testing" --inputs="name:name type:textfield label:Name options: description: maxlength:64 size:64 default_value: weight:0" --no-interaction
```

As result, we will get the following code:

```
use Drupal\Core\Form\FormStateInterface;

/**
 * Implements hook_form_alter() on behalf of testing.module.
 */
function testing_form_alter(&$form, FormStateInterface $form_state, $form_id) {
    // Change form id here
    if ($form_id == 'form_test_alter_form') {
        drupal_set_message('form_test_form_alter() executed.');

        $form['name'] = array(
          '#type' => 'textfield',
          '#title' => t('Name'),
          '#description' => t(''),
          '#maxlength' => 64,
          '#size' => 64,
          '#weight' => '0',
        );

    }
}
```

Checking out, the code above we can see that is just an example, and you need to change the proper form id, but, at least, we have a starting point and example about how to add new form elements.


#Generate a form alter using webprofiler.

## Installing and enabling Webprofiler.

Firstly, you need to get the latest version of devel module, because as I said before, webprofiler is a submodule of devel. Let's do that using **Drupal Console**.

```
$ drupal module:download devel --latest
```

Secondly, just enable the webprofiler module as you can see in the following snippet.

```
$ drupal module:install webprofiler
```

## Generating a form alter using Webprofiler

After enabling the module we just need to navigate to your website visiting the pages with forms we can to alter, when Webprofiler is installed you will get a toolbar at the bottom as you can see in the following image.

<img style="margin-right: 20px;" src="{{site.url }}/assets/img/drupal_webprofiler.png"/>

Now, If we want to include an extra field in theme configuration, we just need to visit page http://example.comv/admin/appearance/settings/bartik tp store form information in Webprofiler inventory.

Using the command **generate:form:alter** but now in interactive mode, the command will detect that webprofiler module is installed, and we will provide us a list of form id available and give us the option to remove some fields from form, as you can check out in the following image.

```
drupal generate:form:alter --module=testing
```

<img style="margin-right: 20px;" src="{{site.url }}/assets/img/console_generate_webprofiler.png"/>

The interactive mode provides a list of form ids available; you can use the arrows on your keyboard to navigate through options available.

The code generated now will be more precise and as you can see using the Webprofiler inventory we could decide to remove some form elements and still include new ones. The code generated will be similar to the following snippet.

```
use Drupal\Core\Form\FormStateInterface;

/**
 * Implements hook_form_FORM_ID_alter() on behalf of testing.module.
 * @see \Drupal\system\Form\ThemeSettingsForm method buildForm at core/modules/system/src/Form/ThemeSettingsForm.php
 */
function testing_form_system_theme_settings_alter(&$form, FormStateInterface $form_state) {
    drupal_set_message('testing_form_system_theme_settings_alter() executed.');

    $form['color']['#access'] = FALSE;
   
}
```

As you can see the sky is the limit we can create commands to do a lot of magic using Webprofiler inventory.

I hope do you found this article useful.