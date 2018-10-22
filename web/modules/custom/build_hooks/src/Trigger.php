<?php

namespace Drupal\build_hooks;

use Drupal\Core\Config\ConfigFactoryInterface;
use GuzzleHttp\Client;

/**
 * Class Trigger.
 */
class Trigger implements TriggerInterface {

  /**
   * Drupal\Core\Config\ConfigFactoryInterface definition.
   *
   * @var \Drupal\Core\Config\ConfigFactoryInterface
   */
  protected $configFactory;

  /**
   * GuzzleHttp\ClientInterface definition.
   *
   * @var \GuzzleHttp\Client
   */
  protected $httpClient;

  /**
   * Constructs a new Trigger object.
   */
  public function __construct(
    ConfigFactoryInterface $config_factory,
    Client $http_client
  ) {
    $this->configFactory = $config_factory;
    $this->httpClient = $http_client;
  }

  public function execute() {
    $hook = $this->configFactory
      ->get('build_hooks.settings')
      ->get('build_hook');
    $this->httpClient->post($hook);
  }
}
