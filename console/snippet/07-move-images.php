<?php

// use valid domain
$domain = 'jmolivas.weknowinc.com';

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$files = $fileStorage->loadMultiple();

/** @var Symfony\Component\Filesystem\Filesystem $fileSystem */
$fileSystem = new \Symfony\Component\Filesystem\Filesystem();

foreach ($files as $file) {
  echo 'Updating file: ' . $file->id() . ' - ' . $file->label() . PHP_EOL;

  $url =  DRUPAL_ROOT . $file->url->value;
  $uri = $file->uri->value;

  $replace = str_replace(
    [DRUPAL_ROOT.'/sites/'.$domain.'/files/'.$file->label()],
    ['', ''],
    $url
  );

  $urlNew = str_replace($replace, 'images', $url);
  $uriNew = str_replace($replace, 'images', $uri);

  try {
    $fileSystem->rename(
      $url,
      $urlNew
    );
    $file->setFileUri($uriNew);
    $file->save();
  } catch (\Exception $e) {
    echo $e->getMessage() . PHP_EOL;
  }

  echo '----------------------------' . PHP_EOL;
}
