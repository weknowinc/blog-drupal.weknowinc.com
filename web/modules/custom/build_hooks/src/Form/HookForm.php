<?php

namespace Drupal\build_hooks\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Class HookForm.
 */
class HookForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'build_hooks.settings',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'hook_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('build_hooks.settings');
    $form['build_hook'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Build hook'),
      '#description' => $this->t('Enter build hook'),
      '#maxlength' => 64,
      '#size' => 64,
      '#default_value' => $config->get('build_hook'),
    ];
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    parent::submitForm($form, $form_state);

    $this->config('build_hooks.settings')
      ->set('build_hook', $form_state->getValue('build_hook'))
      ->save();
  }

}
