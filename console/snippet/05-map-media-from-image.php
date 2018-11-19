<?php

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

$nodes = $fileStorage->loadMultiple();
// $uid = 6;
$uid = 5;
foreach ($nodes as $node) {

  echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;

  $image = $node->get('field_image')->entity;


  if (!$image) {
    continue;
  }

  echo $image->id() . ' : ' . $image->uuid() . ' - ' . $image->getFilename() . PHP_EOL;

  $media = current($mediaStorage->loadByProperties([
    'bundle' => 'image',
    'uid' => $uid,
    'name' => $image->getFilename(),
  ]));

  if (!$media) {
    continue;
  }

  echo $media->id() . ' : ' . $media->uuid() . PHP_EOL;

  $node->field_media_image = $media;

  $node->field_image = null;
  $node->field_preview = null;
  $node->save();
}