<?php

namespace Drupal\wk_migration\Plugin\migrate\process;

use Drupal\migrate\ProcessPluginBase;
use Drupal\migrate\MigrateExecutableInterface;
use Drupal\migrate\Row;

/**
 * A plugin to output raw migration row and field data for debugging.
 *
 * @MigrateProcessPlugin(
 *   id = "dump",
 *   handle_multiples = true
 * )
 */
class Dump extends ProcessPluginBase {

  /**
   * {@inheritdoc}
   */
  public function transform($value, MigrateExecutableInterface $migrate_executable, Row $row, $destination_property) {
    if (isset($this->configuration['method']) && $this->configuration['method'] == 'row') {
      print_r($row->getSource());
    }
    else {
      print_r($value);
    }

    print "\n";
    return $value;
  }

}
