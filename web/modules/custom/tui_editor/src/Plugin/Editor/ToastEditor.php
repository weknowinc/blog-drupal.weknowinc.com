<?php

namespace Drupal\tui_editor\Plugin\Editor;

use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\editor\Plugin\EditorBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\editor\Entity\Editor;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Defines a Toast UI Editor for Drupal.
 *
 * @Editor(
 *   id = "tui_editor",
 *   label = @Translation("Toast UI Editor"),
 *   supports_content_filtering = TRUE,
 *   supports_inline_editing = TRUE,
 *   is_xss_safe = FALSE,
 *   supported_element_types = {
 *     "textarea"
 *   }
 * )
 */
class ToastEditor extends EditorBase implements ContainerFactoryPluginInterface {
  /**
   * The module handler to invoke hooks on.
   *
   * @var \Drupal\Core\Extension\ModuleHandlerInterface
   */
  protected $moduleHandler;
  /**
   * The language manager.
   *
   * @var \Drupal\Core\Language\LanguageManagerInterface
   */
  protected $languageManager;
  /**
   * The renderer.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * Constructs a Drupal\Component\Plugin\PluginBase object.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler to invoke hooks on.
   * @param \Drupal\Core\Language\LanguageManagerInterface $language_manager
   *   The language manager.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, ModuleHandlerInterface $module_handler, LanguageManagerInterface $language_manager, RendererInterface $renderer) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->moduleHandler = $module_handler;
    $this->languageManager = $language_manager;
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('module_handler'),
      $container->get('language_manager'),
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getDefaultSettings() {
    return [
      'saveHTMLToTextarea' => FALSE,
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state, Editor $editor) {
    $settings = $editor->getSettings();
    $form['saveHTMLToTextarea'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Save HTML To Textarea'),
      '#default_value' => $settings['saveHTMLToTextarea'],
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsFormSubmit(array $form, FormStateInterface $form_state) {

  }

  // @codingStandardsIgnoreStart
  /**
   * {@inheritdoc}
   */
  public function getJSSettings(Editor $editor) {
    // @codingStandardsIgnoreEnd
    $settings = $editor->getSettings();
    $js_settings['saveHTMLToTextarea'] = (bool) $settings['saveHTMLToTextarea'];
    return $js_settings;
  }

  /**
   * {@inheritdoc}
   */
  public function getLibraries(Editor $editor) {
    $libraries = [
      'tui_editor/tui_editor',
      'tui_editor/drupal.tui_editor',
    ];

    return $libraries;
  }

}
