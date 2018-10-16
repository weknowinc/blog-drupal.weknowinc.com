<?php

$nodeStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $nodeStorage->loadMultiple();

foreach ($nodes as $node) {
  $body = str_replace(
    '/sites/jmolivas.weknowinc.com/files',
    '/sites/jmolivas/files',
    $node->get('body')->value
  );
  if ($node->get('body')->value != $body) {
    echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;
    $node->set('body', $body);
    $node->save();
  }
}