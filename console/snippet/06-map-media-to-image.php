<?php

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $fileStorage->loadMultiple();

foreach ($nodes as $node) {

  echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;

  $node->field_image = $node->get('field_media_image')->entity;

//  $node->field_media_image = null;

  $node->save();
}