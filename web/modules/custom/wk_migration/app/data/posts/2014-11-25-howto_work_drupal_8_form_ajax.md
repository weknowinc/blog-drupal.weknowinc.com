---
layout: post
title: How to work with Drupal 8 forms with Ajax.
description: "How to add Ajax effect to a Form in Drupal 8"
categories: [articles]
tags: [Drupal, Ajax, Drupal8]
draft: false
---
Nowadays Drupal 8 has couple of beta releases so the official release is around the corner. For that reason I start to test the typical features required in a Drupal 7 site.

Today I will share with you my experiences with Form with Ajax effects.

#Create a Form

I will skip the explanation about how to create a Form in Drupal 8 because could be generated using the project <a href="http://drupalconsole.com/" target="_blank">Drupal Console</a> executing the following command.

```
$ php console.phar generate:form:config
```

#Drupal 8 FAPI + Ajax

The current documentation of FAPI for Drupal 8 about <a href="https://api.drupal.org/api/drupal/developer!topics!forms_api_reference.html/8#ajax" target="_blank">ajax</a> is not updated.

But the property is still name **#ajax** check the following implementation.

```
   $form['source']['version'] = array(
      '#type' => 'radios',
      '#title' => $this->t('Drupal Version'),
      '#default_value'=>"d6",
      '#options' => $options,
      '#description' => t('Choise what version of Drupal you want migrate'),
      '#required' => TRUE,
      '#ajax' => array(
        'callback' => '::updateDestinationIds',
        'wrapper' => 'edit-destinations',
        'progress' => array(
          'type' => 'throbber',
          'message' => "searching",
        ),
      ),
    );
```
If you are a old developer of Drupal you will recognize the properties **wrapper**, **progress**, these properties work equal in Drupal 7.

The main change is in callback property, in my example the value '::updateDestinationIds' means the method *updateDestinationIds* is part of the Form class. I didn't test but looks like we can assign a static method like 'Drupal::StaticMethod'.

#Response method

Similar to Drupal 7 the method has to return the portion of the Form must be overwritten via ajax, let me show you an example.

```
/**
 * Gets migration configurations.
 *
 * @return array
 *   An array of migration names.
 */
function updateDestinationIds($form, FormStateInterface $form_state) {
    $form ['source']['migration_ids']['#options'] = $this->getDestinationIds($form_state->getValue('version'));
    return $form ['source']['migration_ids'];
}
```

#Known Issues

After implement the Ajax function I detect a problem when I try to select values populated via Ajax and submit the form I get this error message "An illegal choice has been detected. Please contact the site administrator."

When I debug I can determine the method <a href="https://api.drupal.org/api/drupal/core!lib!Drupal!Core!Installer!Form!SiteSettingsForm.php/function/SiteSettingsForm%3A%3AbuildForm/8" target="_blank">buildForm</a> is executed in different moments listed below

* **Form load**: To build the form
* **Ajax request**: To re-build the form and determine elements to overwrite.
* **Form submit**: To process the form

My problem was in the last one *Form Submit* because the submit run the implementation of class <a href="https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Form%21FormValidator.php/8" target="_blank">FormValidator</a>.

The FormValidator ignore the Ajax process and validate the FormState values against the list of values allowed and because took this values from buildForm they are always the initial values ignoring the user interaction.

To resolve this problem I use the  <a href="https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Form%21FormState.php/class/FormState/8" target="_blank">FormState</a> object to determine if buildForm was executed to render the form at first time or if has human interaction (ajax or submit) to define the allowed list of values based in user interaction, check the following snippet.


```
$form_state_complete_form=$form_state->getCompleteForm();
if(empty($form_state_complete_version)){
    $form ['source']['migration_ids']['#options'] = $this->getDestinationIds("d6");
 }
  else  {
   $form ['source']['migration_ids']['#options'] = $this->getDestinationIds($form_state_complete_version);
 }
```

Don't be worry about this behavior as you can see is easy to fix and I'm sure won't be necessary when Drupal 8 get the first official release.

#Caveats

The current status of Drupal 8 only support the ajax update in *Select* elements, I tried with **tableselect** and **checkboxes** and doesn't work.

There is an issue for this problem at <a href="https://www.drupal.org/node/1458824" target="_blank">Ajax doesn't work with Tableselect with checkboxes</a>.

