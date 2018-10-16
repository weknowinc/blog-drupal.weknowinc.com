<?php

$termStorage = \Drupal::entityTypeManager()
  ->getStorage('taxonomy_term');

$terms = $termStorage->loadMultiple();

foreach ($terms as $term) {
  echo 'Update term: ' . $term->id() . ' - ' . $term->label() . PHP_EOL;
  $term->save();
}
