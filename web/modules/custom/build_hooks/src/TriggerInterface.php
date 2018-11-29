<?php

namespace Drupal\build_hooks;

/**
 * Interface TriggerInterface.
 */
interface TriggerInterface {

  /**
   * return void
   */
  public function execute();

  /**
   * return void
   */
  public function executeCron();

  /**
   * @param String $nodeType
   *
   * return void
   */
  public function executeNode($nodeType);

  /**
   * return void
   */
  public function showMenu();

}
