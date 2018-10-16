<?php

$nodeStorage = \Drupal::entityTypeManager()
  ->getStorage('node');

$nodes = $nodeStorage->loadMultiple();

foreach ($nodes as $node) {
  $body = preg_replace_callback(
    '/\[gist-embed (.*?)\]/',
    function ($matches) {
      $pieces = [];
      foreach (explode(' ', $matches[1]) as $match) {
        $pieces[explode('=',  $match)[0]] = str_replace(
          ['"','\\'],
          ['',''],
          explode('=',  $match)[1]
        );
      }

      return '`gist:jmolivas/'.$pieces['data-gist-id'].'#'.$pieces['data-gist-file'].'`';;
    },
    $node->get('body')->value
  );
  if ($node->get('body')->value != $body) {
    echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;
    $node->set('body', $body);
    $node->save();
  }
}
