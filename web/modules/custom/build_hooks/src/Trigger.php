<?php

namespace Drupal\build_hooks;

use Drupal\Core\Config\ConfigFactoryInterface;
use GuzzleHttp\Exception\RequestException;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Messenger\MessengerInterface;
use GuzzleHttp\ClientInterface;
use Drupal\Core\StringTranslation\TranslationManager;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;

/**
 * Class Trigger.
 */
class Trigger implements TriggerInterface {

  /**
   * The config.factory service
   *
   * @var \Drupal\Core\Config\ConfigFactoryInterface
   */
  protected $configFactory;

  /**
   * The http_client service
   *
   * @var \GuzzleHttp\ClientInterface
   */
  protected $httpClient;

  /**
   * The current_user service
   *
   * @var \Drupal\Core\Session\AccountProxyInterface
   */
  protected $currentUser;

  /**
   * The string_translation service
   *
   * @var \Drupal\Core\StringTranslation\TranslationManager
   */
  protected $stringTranslation;

  /**
   * The messenger service
   *
   * @var \Drupal\Core\Messenger\MessengerInterface
   */
  protected $messenger;

  /**
   * The logger.factory service
   *
   * @var \Drupal\Core\Logger\LoggerChannelFactoryInterface
   */
  protected $logger;

  /**
   * Constructs a new Trigger object.
   */
  public function __construct(
    ConfigFactoryInterface $configFactory,
    ClientInterface $httpClient,
    AccountProxyInterface $currentUser,
    TranslationManager $stringTranslation,
    MessengerInterface $messenger,
    LoggerChannelFactoryInterface $logger
  ) {
    $this->configFactory = $configFactory;
    $this->httpClient = $httpClient;
    $this->currentUser = $currentUser;
    $this->stringTranslation = $stringTranslation;
    $this->messenger = $messenger;
    $this->logger = $logger;
  }

  public function execute() {
    if (!$this->isValidUser()) {
      $message = $this->stringTranslation->translate(
        'Insufficient user acess',
        []
      );
      $this->logger->get('build_hooks')->error($message);
      return FALSE;
    }

    try {
      $hook = $this->configFactory
        ->get('build_hooks.settings')
        ->get('build_hook');

       $this->httpClient->post($hook.'-lorem');

       $message = 'Build Hook Executed';
       $this->processMessage($message);
       $this->processLog($message);
    }
    catch (RequestException $exception) {
      $message = $this->stringTranslation->translate(
        'Build Hook execute error: "%error"',
        ['%error' => $exception->getMessage()]
      );
      $this->messenger->addError($message);
      $this->logger->get('build_hooks')->error($message);
      return FALSE;
    }

    return TRUE;
  }

  public function executeCron() {
    $execute = (bool)$this->configFactory
      ->get('build_hooks.settings')
      ->get('triggers.cron');

    if ($execute) {
      $this->execute();
    }
  }

  public function executeNode($nodeType) {
    $execute = (bool)$this->configFactory
      ->get('build_hooks.settings')
      ->get('triggers.node.'.$nodeType);

    if ($execute) {
      $this->execute();
    }
  }

  public function showMenu() {
    if (!$this->isValidUser()) {
      return FALSE;
    }

    return (bool)$this->configFactory
      ->get('build_hooks.settings')
      ->get('triggers.menu');
  }

  private function isValidUser() {
    return $this->currentUser->hasPermission('access admin');
  }

  private function processMessage($message, $args = []) {
    $show = (bool)$this->configFactory
      ->get('build_hooks.settings')
      ->get('messages.show');

    if (!$show) {
      return;
    }

    $this->messenger->addMessage(
      $this->stringTranslation->translate(
        $message,
        $args
      )
    );
  }

  private function processLog($message, $args = []) {
    $log = (bool)$this->configFactory
      ->get('build_hooks.settings')
      ->get('messages.log');

    if (!$log) {
      return;
    }

    $this->logger->get('build_hooks')->info(
      $this->stringTranslation->translate(
        $message,
        $args
      )
    );
  }

}
