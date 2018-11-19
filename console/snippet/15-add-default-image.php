<?php

$mediaId = 1213;

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

$media = $mediaStorage->load($mediaId);

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $fileStorage->loadMultiple();

foreach ($nodes as $node) {

  $fieldImage = $node->get('field_image')->entity;

  if ($fieldImage) {
    continue;
  }

  echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;

  $node->field_image = $media;

  $node->save();
}
