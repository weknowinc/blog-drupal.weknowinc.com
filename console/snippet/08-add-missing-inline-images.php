<?php

// use valid domain
$domain = 'jmolivas.weknowinc.com';

$finder = new \Symfony\Component\Finder\Finder();

$files = $finder
  ->in(DRUPAL_ROOT.'/sites/'.$domain.'/files/inline-images/')
  ->files();

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

// jmolivas
$uid = 6;

/** @var Symfony\Component\Filesystem\Filesystem $fileSystem */
$fileSystem = new \Symfony\Component\Filesystem\Filesystem();

foreach ($files as $inlineImage) {
  $newPath = str_replace(
    'inline-images',
    'images',
    $inlineImage->getRealPath()
  );

  $uri = 'public://images/' . $inlineImage->getFilename();

  $file = current($fileStorage
    ->loadByProperties(['uri' => $uri]));

  if ($file) {
    continue;
  }

  try {
    $fileSystem->rename(
      $inlineImage->getRealPath(),
      $newPath
    );

  } catch ( \Exception $e) {
    echo $e->getMessage() . PHP_EOL;
    continue;
  }

  echo 'Moving file: ' . $inlineImage->getFilename() . PHP_EOL;

  $image = \Drupal\file\Entity\File::create();
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
  echo $newPath . PHP_EOL;
  echo $uri . PHP_EOL;
  echo $file->id() . ' - ' . $file->uuid() . PHP_EOL;
  echo $media->id() . ' - ' . $media->uuid() . PHP_EOL;
  echo '-----------------------------------------' . PHP_EOL;
}
