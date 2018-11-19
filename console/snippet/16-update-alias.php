<?php

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $fileStorage->loadMultiple();

foreach ($nodes as $node) {
  $node->save();
}
