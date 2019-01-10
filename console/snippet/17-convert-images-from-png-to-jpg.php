<?php

$site = 'jmolivas';
//$site = 'enzo';

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$files = $fileStorage->loadMultiple();

$old_files = [];
$new_files = [];

foreach ($files as $file) {
  if (preg_match('/\.png$/', $file->label())) {
    echo 'Converting file ' . $file->label() . PHP_EOL;

    $relative_file_path = '/sites/' . $site . '/files/images/' . $file->label();
    $file_path = DRUPAL_ROOT . $relative_file_path;

    if (pngtojpg($file_path)) {
      $uri = 'public://images/' . preg_replace('/\.png$/', '.jpg', $file->label());
      echo 'Updating uri ' . $uri . PHP_EOL;
      $file->setFileUri($uri);
      $file->save();
      $new_relative_file_path = preg_replace('/\.png$/', '.jpg', $relative_file_path);
      $old_files[] = $relative_file_path;
      $new_files[] = $new_relative_file_path;
    }
    else {
      echo 'Failed.' . PHP_EOL;
    }
  }
}

$nodeStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $nodeStorage->loadMultiple();

foreach ($nodes as $node) {
  $body = str_replace(
    $old_files,
    $new_files,
    $node->get('body')->value
  );
  if ($node->get('body')->value != $body) {
    echo 'Updating reference in node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;
    $node->body->value = $body;
    $node->body->format = 'full_html';
    $node->save();
  }
}

function pngtojpg($file_path, $quality = 100) {
  $image = imagecreatefrompng($file_path);
  $bg = imagecreatetruecolor(imagesx($image), imagesy($image));
  imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
  imagealphablending($bg, TRUE);
  imagecopy($bg, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
  imagedestroy($image);
  $file_path = preg_replace('/\.png$/', '.jpg', $file_path);
  $result = imagejpeg($bg, $file_path, $quality);
  imagedestroy($bg);
  return $result;
}
