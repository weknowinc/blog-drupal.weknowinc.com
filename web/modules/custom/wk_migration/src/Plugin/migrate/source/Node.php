<?php

namespace Drupal\wk_migration\Plugin\migrate\source;

// use Drupal\Core\Extension\ModuleHandlerInterface;
 use Drupal\migrate\Row;
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
 *   id = "wk_d8_node",
 *   source_provider = "node"
 * )
 */
class Node extends SqlBase {
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
    $query = $this->select('node_field_revision', 'nr')
      ->fields('n', [
        'nid',
        'type',
        'status',
        'created',
        'changed',
        'promote',
        'sticky',
      ])
      ->fields('nr', [
        'vid',
        'title',
      ])
      ->fields('nb', [
        'body_value',
        // 'title',
      ]);
    // $query->addField('n', 'uid', 'node_uid');
    // $query->addField('nr', 'uid', 'revision_uid');
    $query->innerJoin('node_field_data', 'n', static::JOIN);
    $query->innerJoin('node_revision__body', 'nb', 'n.vid = nb.revision_id');
    //$query->innerJoin('node_revision__field_tags', 'ft', 'n.vid = ft.revision_id');
    // If the content_translation module is enabled, get the source langcode
    // to fill the content_translation_source field.
    // if ($this->moduleHandler->moduleExists('content_translation')) {
    //   $query->leftJoin('node', 'nt', 'n.tnid = nt.nid');
    //   $query->addField('nt', 'language', 'source_langcode');
    // }
    // $this->handleTranslations($query);

    if (isset($this->configuration['node_type'])) {
      $query->condition('n.type', $this->configuration['node_type']);
    }
    return $query;
  }

  /**
   * {@inheritdoc}
   */
  public function prepareRow(Row $row) {
  //   // Get Field API field values.
  //   foreach (array_keys($this->getFields('node', $row->getSourceProperty('type'))) as $field) {
    $nid = $row->getSourceProperty('nid');
    $vid = $row->getSourceProperty('vid');
    $query = $this->select('node_revision__field_tags', 't')
      ->fields('t', [
        'field_tags_target_id',
      ])
      ->condition('revision_id', $vid)
      ->execute()
      ->fetchAll();
    $row->setSourceProperty('field_tags', $query);
    $query = $this->select('node_revision__field_image', 'i')
      ->fields('i', [
        'field_image_target_id',
      ])
      ->condition('revision_id', $vid)
      ->execute()
      ->fetchAll();
    $row->setSourceProperty('field_image', $query);
    $query = $this->select('url_alias', 'a')
      ->fields('a', [
        'alias',
      ])
      ->condition('source', '/node/' . $nid)
      ->execute()
      ->fetchAll();
    $row->setSourceProperty('path', $query);
    return parent::prepareRow($row);
  }

  /**
   * {@inheritdoc}
   */
  public function fields() {
    $fields = [
      'nid' => $this->t('Node ID'),
      'type' => $this->t('Type'),
      'title' => $this->t('Title'),
      'node_uid' => $this->t('Node authored by (uid)'),
      'revision_uid' => $this->t('Revision authored by (uid)'),
      'created' => $this->t('Created timestamp'),
      'changed' => $this->t('Modified timestamp'),
      'status' => $this->t('Published'),
      'promote' => $this->t('Promoted to front page'),
      'sticky' => $this->t('Sticky at top of lists'),
      'revision' => $this->t('Create new revision'),
      'language' => $this->t('Language (fr, en, ...)'),
      'tnid' => $this->t('The translation set id for this node'),
      'timestamp' => $this->t('The timestamp the latest revision of this node was created.'),
    ];
    return $fields;
  }

  /**
   * {@inheritdoc}
   */
  public function getIds() {
    $ids['nid']['type'] = 'integer';
    $ids['nid']['alias'] = 'n';
    return $ids;
  }

  /**
   * Adapt our query for translations.
   *
   * @param \Drupal\Core\Database\Query\SelectInterface $query
   *   The generated query.
   */
  // protected function handleTranslations(SelectInterface $query) {
  //   // Check whether or not we want translations.
  //   if (empty($this->configuration['translations'])) {
  //     // No translations: Yield untranslated nodes, or default translations.
  //     $query->where('n.tnid = 0 OR n.tnid = n.nid');
  //   }
  //   else {
  //     // Translations: Yield only non-default translations.
  //     $query->where('n.tnid <> 0 AND n.tnid <> n.nid');
  //   }
  // }

}
