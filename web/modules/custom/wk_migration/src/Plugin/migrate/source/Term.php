<?php

namespace Drupal\wk_migration\Plugin\migrate\source;

// use Drupal\Core\Extension\ModuleHandlerInterface;
//use Drupal\migrate\Row;
// use Drupal\migrate_drupal\Plugin\migrate\source\d7\FieldableEntity;
// use Drupal\Core\Database\Query\SelectInterface;
// use Drupal\Core\Entity\EntityManagerInterface;
// use Drupal\Core\Extension\ModuleHandler;
// use Drupal\Core\State\StateInterface;
// use Drupal\migrate\Plugin\MigrationInterface;
// use Symfony\Component\DependencyInjection\ContainerInterface;

use Drupal\migrate\Plugin\migrate\source\SqlBase;

/**
 * Drupal 8 node source from database.
 *
 * @MigrateSource(
 *   id = "wk_d8_term"
 * )
 */
class Term extends SqlBase {
  /**
   * The module handler.
   *
   * @var \Drupal\Core\Extension\ModuleHandlerInterface
   */
  protected $moduleHandler;

  /**
   * The join options between the node and the node_revisions table.
   */
  const JOIN = 'n.vid = nr.vid';

  /**
   * {@inheritdoc}
   */
  public function query() {
    // Select node in its last revision.
    $query = $this->select('taxonomy_term_data', 't')
      ->fields('t', [
        'tid',
        'vid',
        'langcode',
      ])
      ->fields('td',['name', 'weight', 'changed']);
    $query->innerJoin('taxonomy_term_field_data', 'td', 't.tid = td.tid');
    return $query;
  }

  /**
   * {@inheritdoc}
   */
  public function fields() {
    $fields = [
      'tid' => $this->t('Term ID'),
      'vid' => $this->t('Vocabulary'),
      'langcode' => $this->t('Language'),
      'name' => $this->t('Name'),
      'weight' => $this->t('Weight'),
      'changed' => $this->t('Changed'),
    ];
    return $fields;
  }

  /**
   * {@inheritdoc}
   */
  public function getIds() {
    $ids['tid']['type'] = 'integer';
    $ids['tid']['alias'] = 't';
    return $ids;
  }
}
