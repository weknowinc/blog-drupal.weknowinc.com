---
layout: post
title: "How to remove file documents from SOLR index after been replaced in nodes in Drupal 7"
categories: [articles]
tags: [SOLR,,Drupal]
---
If you have revisions enabled in your content types, it keeps all your old files on the server (associated with old revisions), 
so replacing a file definitely is harder. 

Even though if you don't have revisions enabled, if you try to remove it and add it again to the node, the name/link is 
updated, but since a file with that name is kept on the server and there is a name duplication, Drupal adds those "_0", 
"_1" etc suffixes to future uploaded versions of that file's name.

In term of node render is not a problem, but in terms of SOLR indexing all those files will be indexed, so instead of get 
one record for a match is possible get N records where N is the number of time do you overwrite the same file.

Then, to resolve this annoying behavior I will show you a solution to remove a file document from SOLR index if a file is 
removed from a node. this solution use [Entity API](https://www.drupal.org/project/entity) module so it should be added 
as a dependency in your module .info file.

```
/**
 * Implements hook_node_update().
 */
function MYMODULE_node_update($node) {

  // Array of content types to act on.
  if (in_array($node->type, array('article', 'blog_post'))) {
    $wrapper = entity_metadata_wrapper('node', $node);
    $original_wrapper = entity_metadata_wrapper('node', $node->original);

    // Array of file fields to act on.
    foreach (array('field_public_files', 'field_private_files') as $field) {
      if (!isset($original_wrapper->{$field})) {
        continue;
      }
      $current_files = array();
      $original_files = array();

      // Get files that were attached to the original node (before update).
      foreach ($original_wrapper->{$field}->value() as $file) {
        $original_files[] = $file['fid'];
      }
      // Stop if there were no files previously attached.
      if (empty($original_files)) {
        continue;
      }

      // Get files currently attached to the node (after update).
      foreach ($wrapper->{$field}->value() as $file) {
        $current_files[] = $file['fid'];
      }

      // Delete files that were in the original node but were removed during this update
      $deleted_files = array_diff($original_files, $current_files);
      if(!empty($deleted_files)) {
       $env_id = apachesolr_default_environment();
       $solr = apachesolr_get_solr($env_id);
       foreach ($deleted_files as $fid) {
         $file_id = apachesolr_document_id($fid, 'file') . '-' . $node->nid;

         // Remove file document from SOLR index, re-index is not required,
         $solr->deleteByQuery("id:$file_id");
       }
      }
    }
      $deleted_files = array_diff($original_files, $current_files);
      if(!empty($deleted_files)) {

    }
  }
}
```

The code above react when a node is updated for specific content types and specific fields, using function [entity_metadata_wrapper](http://www.drupalcontrib.org/api/drupal/contributions!entity!entity.module/function/entity_metadata_wrapper/7) 
we can determine the information of our node before update and after update.

After calculate if some files were deleted the logic to delete the file document from SOLR is applied, let me see that code 
in detail

```
$env_id = apachesolr_default_environment();
$solr = apachesolr_get_solr($env_id);
foreach ($deleted_files as $fid) {
 $file_id = apachesolr_document_id($fid, 'file') . '-' . $node->nid;

 // Remove file document from SOLR index, re-index is not required,
 $solr->deleteByQuery("id:$file_id");
}
```

Firstly, a SOLR object instance is declared. In my example I use the default SOLR instance, if you have more than one instance 
of SOLR is necessary to change the logic to use the proper instance.

Using [apachesolr_document_id](http://www.drupalcontrib.org/api/drupal/contributions!apachesolr!apachesolr.module/function/apachesolr_document_id/6) function 
the SOLR ID is calculated using the **fid**, **file** type and providing the specific relation to the specific node subject of 
update, because in some Drupal installs a file could be associated to several nodes.

Finally, using [deleteByQuery](http://www.drupalcontrib.org/api/drupal/contributions!search_api_solr!includes!solr_connection.interface.inc/function/SearchApiSolrConnectionInterface%3A%3AdeleteByQuery/7) method the delete from SOLR index is requested, 
this delete is applied immediately, SOLR re-index is not required.

I expect you found this article useful.