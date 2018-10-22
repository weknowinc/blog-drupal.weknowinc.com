<?php

namespace Drupal\build_hooks;

/**
 * Interface TriggerInterface.
 */
interface TriggerInterface {

  /**
   * return bool
   */
  public function execute();

}
