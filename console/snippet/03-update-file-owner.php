<?php

// $uid = 4;
$uid = 3;

$userStorage = \Drupal::entityTypeManager()
  ->getStorage('user');
$user = $userStorage->load($uid);

$fileStorage = \Drupal::entityTypeManager()
  ->getStorage('file');

$files = $fileStorage->loadMultiple();

foreach ($files as $file) {
  echo 'Updating file' . $file->id() . ' - ' . $file->label() . PHP_EOL;
  $file->setOwner($user);
  $file->setOwnerId($uid);
  $file->save();
}
