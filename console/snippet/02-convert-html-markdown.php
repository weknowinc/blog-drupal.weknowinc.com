<?php

use League\HTMLToMarkdown\HtmlConverter;

// $site = 'jmolivas';
$site = 'enzo';

$nodeStorage = \Drupal::entityTypeManager()
    ->getStorage('node');

$nodes = $nodeStorage->loadMultiple();

$converter = new HtmlConverter();

foreach ($nodes as $node) {

  if (!$node->hasField('body')) {
    continue;
  }

  echo 'Updating node ' . $node->id() . ' - ' . $node->label() . PHP_EOL;  

  $body = str_replace(
    'sites/default/files',
    'sites/'.$site.'/files',
    $node->get('body')->value
  );

  $markdown = $converter->convert($body);
  $node->set('body', $markdown);
  $node->body->format = 'full_html';

  $node->save();
}
