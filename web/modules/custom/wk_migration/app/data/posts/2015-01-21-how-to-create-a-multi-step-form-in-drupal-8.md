---
layout: post
title: "How to create a Multi Step Form in Drupal 8"
categories: [articles]
tags: [Drupal,Drupal 8]
---
Last weekend I organize and participate in the initiative of <a href="http://drupal.org" target="_blank">Drupal</a> Community <a href="http://www.anexusit.com/blog/drupal-sprint-weekend-costa-rica" target="_blank">Global Sprint Weekend</a> with a location in Costa Rica.

Among talks and contributions I found a interesting request in Drupal 8 and I want to share with my the implementation.

I want to create a Multi Step Form, because Drupal 8 doesn't have an official release yet there are many stuff we easily do in Drupal 7 but now in some way to need to learn again how to solve our problems in a different way or Drupal/Symfony Style.

I will create a Multi Step Form to enable users to find a car providing Year, Body Style and Gas Mileage.

#Create a Module

I will skip the explanation about how to create the Module **multi_step_form** in Drupal 8 because could be generated using the project <a href="http://drupalconsole.com/" target="_blank">Drupal Console</a> executing the following command.

```
$ drupal generate:module
```

After generate the module we will use another command to add a Form with properties required as you can see below

```
$ drupal generate:form:config
```

As result we will get a form with a method **buildForm** like this

```
/**
 * {@inheritdoc}
 */
public function buildForm(array $form, FormStateInterface $form_state) {

  $config = $this->config('multi_step.multi_step_form_config');

  $form['model'] = [
    '#type' => 'select',
    '#title' => $this->t('Model'),
    '#description' => $this->t(''),
          '#options' => array('1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015'),
          '#default_value' => $config->get('model'),
  ];

  $form['body_style'] = [
    '#type' => 'checkboxes',
    '#title' => $this->t('Body Style'),
    '#description' => $this->t(''),
          '#options' => array('Coupe', 'Sedan', 'Convertible', 'Hatchbac', 'Station wagon', 'SUV', 'Minivan', 'Full-size van', 'Pick-up'),
          '#default_value' => $config->get('body_style'),
  ];

  $form['gas_mileage'] = [
    '#type' => 'radios',
    '#title' => $this->t('Gas Mileage'),
    '#description' => $this->t(''),
          '#options' => array('20 mpg or less', '21 mpg or more', '26 mpg or more', '31 mpg or more', '36 mpg or more', '41 mpg or more'),
          '#default_value' => $config->get('gas_mileage'),
  ];

  return parent::buildForm($form, $form_state);

}
```

##Define step property

Inside the Form class we need to a protected property to store the current step of Multi Step,check the following snippet.

```
class MultiStepForm extends ConfigFormBase
 {

  protected $step = 1;
```
## Get parent form

Instead of call parent functon **buildForm** at the end I will call at the beginning to modify the form before the form is render.

```
/**
 * {@inheritdoc}
 */
public function buildForm(array $form, FormStateInterface $form_state) {
  $form = parent::buildForm($form, $form_state);
```

## Filter form elements by step

Now we need filter what elements of form will be rendered based in step value, as you can see in following snippet.

```
if($this->step == 1) {
  $form['model'] = [
    '#type' => 'select',
    '#title' => $this->t('Model'),
    '#description' => $this->t(''),
          '#options' => array('1997', '1998', '1999', '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015'),
          '#default_value' => $config->get('model'),
  ];
}
```

## Change submit label

Now we need alter the label of submit button to inform end user that there is a next step or if we reach the end of multi step.

In our case we only have 3 steps and the code will be like this

```
if($this->step < 3) {
  $button_label = $this->t('Next');
}
else {
  $button_label = $this->t('Find a Car');
}

$form['actions']['submit']['#value'] = $button_label;

return $form;
```

## Enable Multi Step

At the end we need enable the Multi Step Form behaviour, to do this is necessary modify the method **submitForm** forcing Form Rebuild if we don't reach yet the last step of Multi Step using the method <a href="https://api.drupal.org/api/drupal/core!lib!Drupal!Core!Form!FormState.php/function/FormState%3A%3AsetRebuild/8" target="_blank">setRebuild()</a> part of <a href="https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Form%21FormState.php/class/FormState/8" target="_blank">Form State</a>.

The submitForm method will be similar to following code

```
/**
 * {@inheritdoc}
 */
public function submitForm(array &$form, FormStateInterface $form_state) {
  if($this->step < 3) {
    $form_state->setRebuild();
    $this->step++;
  }
  else {
    parent::submitForm($form, $form_state);
    /*$this->config('multi_step.multi_step_form_config')
          ->set('model', $form_state->getValue('model'))
          ->set('body_style', $form_state->getValue('body_style'))
          ->set('gas_mileage', $form_state->getValue('gas_mileage'))
        ->save();*/
  }
}
```

If you want test a full implementation of Multi Step you can download the module <a href="https://github.com/enzolutions/drupal8_multi_step_form" target="_blank">drupal8_multi_step_form</a>.

I hope you found this blog entry useful.
