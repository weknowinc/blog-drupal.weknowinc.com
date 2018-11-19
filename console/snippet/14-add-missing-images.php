<?php

$site = 'enzo';

$finder = new \Symfony\Component\Finder\Finder();

$basePath = DRUPAL_ROOT.'/sites/'.$site.'/files/';

$files = $finder
  ->in($basePath)
  ->notPath('media-icons')
  ->notPath('php')
  ->notPath('pictures')
  ->notPath('private')
  ->notPath('styles')
  ->files();

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

// $uid = 6;
$uid = 5;

/** @var Symfony\Component\Filesystem\Filesystem $fileSystem */
$fileSystem = new \Symfony\Component\Filesystem\Filesystem();

foreach ($files as $inlineImage) {

  $relativePath = str_replace(
    $basePath,
    '',
    $inlineImage->getRealPath()
  );

  $uri = 'public://' . $relativePath;

  $file = current($fileStorage
    ->loadByProperties(['uri' => $uri]));

  if ($file) {
    continue;
  }

  // echo 'Creating file: ' . $inlineImage->getFilename()  . 
  //      ' using uri: ' .  $uri . PHP_EOL;

  $file = $fileStorage->create([
    'uri' => $uri,
    'uid' => $uid,
    'filename' => $inlineImage->getFilename(),
    'status' => 1,
  ]);
  $file->save();

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

  echo $inlineImage->getFilename() . PHP_EOL;
  echo $inlineImage->getRealPath() . PHP_EOL;
  // echo $newPath . PHP_EOL;
  echo $uri . PHP_EOL;
  echo $file->id() . ' - ' . $file->uuid() . PHP_EOL;
  echo $media->id() . ' - ' . $media->uuid() . PHP_EOL;
  echo '-----------------------------------------' . PHP_EOL;
}
