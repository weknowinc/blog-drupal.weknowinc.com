<?php

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$files = $fileStorage->loadMultiple();

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

// jmolivas
$uid = 6;

foreach ($files as $file) {

  if (!$file->isPermanent()) {
    continue;
  }

  $media = $mediaStorage->create([
    'bundle' => 'image',
    'uid' => $uid,
    'name' => $file->getFilename(),
    'field_media_image' => [
      'target_id' => $file->id(),
      'uuid' => $file->uuid(),
      'alt' => $file->getFilename(),
      'title' => $file->getFilename(),
    ],
  ]);

  $media->save();

  echo $file->id() .
    ' - ' .
    $file->getFilename()  .
    ' - ' .
    $file->getFileUri() .
    ' - ' .
    ($media?$media->id():'no-media') .
    PHP_EOL;
}
