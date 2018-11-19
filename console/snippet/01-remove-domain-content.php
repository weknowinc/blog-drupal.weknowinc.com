<?php

// $domain_id = 'enzo_weknowinc_com';
$domain_id = 'jmolivas_weknowinc_com';

$nodeStorage = \Drupal::entityTypeManager()
    ->getStorage('node');

$nodes = $nodeStorage
  ->loadByProperties(
    [
      'type' => 'article',
      'field_domain_access' => $domain_id
    ]);

foreach ($nodes as $node) {
  echo 'Removing node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;
  $node->delete();
}
