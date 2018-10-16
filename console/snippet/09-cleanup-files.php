<?php

$domain = 'jmolivas.weknowinc.com';

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$files = $fileStorage->loadMultiple();

$mediaStorage = \Drupal::entityTypeManager()
  ->getStorage('media');

$actions = [
  '3' => 'rename',
  '5' => 'delete',
  '6' => 'delete',
  '7' => 'delete',
  '11' => 'delete',
  '12' => 'delete',
  '16' => 'rename',
  '20' => 'rename',
  '21' => 'rename',
  '23' => 'rename',
  '25' => 'delete',
  '26' => 'delete',
  '30' => 'rename',
  '32' => 'delete',
  '37' => 'delete',
  '38' => 'delete',
  '40' => 'delete',
];

/** @var Symfony\Component\Filesystem\Filesystem $fileSystem */
$fileSystem = new \Symfony\Component\Filesystem\Filesystem();

foreach ($files as $file) {
  $uri = $file->uri->value;
  $url = $file->url->value;
  if (strpos($uri,'public://images/')!==0) {

    echo 'Listing file: ' . $file->id() . ' - ' . $file->uuid() . ' - ' . $file->label() . PHP_EOL;
    $action = $actions[$file->id()];
    echo $action  . PHP_EOL;
    if ($action === 'rename') {
      try {
        $urlNew = DRUPAL_ROOT.'/sites/'.$domain.'/files/images/'.$file->label();
        $uriNew = 'public://images/'.$file->label();

        echo $uri . PHP_EOL;
        echo $uriNew . PHP_EOL;

        echo DRUPAL_ROOT . $url . PHP_EOL;
        echo $urlNew . PHP_EOL;
//        $fileSystem->rename(
//          DRUPAL_ROOT . $url,
//          $urlNew
//        );
//        $file->setFileUri($uriNew);
//        $file->save();
      } catch (\Exception $e) {
        echo $e->getMessage() . PHP_EOL;
      }
    }
    if ($action === 'delete') {
      echo $uri . PHP_EOL;
      echo DRUPAL_ROOT . $url . PHP_EOL;
      $media = $mediaStorage->load( $file->id() );
//      $media->delete();
//      $file->delete();
    }
    echo '------------------------' . PHP_EOL;
  }
}