/**
 * @file
 * SimpleMDE implementation of {@link Drupal.editors} API.
 */

(function(Drupal) {

    'use strict';

    /**
     * @namespace
     */
    Drupal.editors.tui_editor = {

        /**
         * Editor attach callback.
         *
         * @param {HTMLElement} element
         *   The element to attach the editor to.
         * @param {string} format
         *   The text format for the editor.
         *
         * @return {bool}
         *   Whether the editor was successfully attached.
         */
        attach: function(element, format) {
            var textarea = document.getElementById(element.id);
            var textarea_wapper = textarea.parentNode;
            textarea_wapper.id = element.id + '-wrapper';

            var textarea_field_wrapper = document.getElementById('node-edit-form-textarea-wrapper');
            textarea_field_wrapper.innerHTML += '<div class="code-html" style="border: none;"><div id="editSection"></div></div>';

            // @TODO strip HTML tags (br,other?)
            jQuery('#'+textarea_wapper.id).parents('.field--type-text-with-summary').hide();

            var editor = new tui.Editor({
                el: document.querySelector('#editSection'),
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                height: '300px',
                exts: ['scrollSync'],
                initialValue: document.getElementById(element.id).value,
                events: {
                    change: function () {
                        // @TODO strip HTML tags (br,other?)
                        document.getElementById(element.id).value = editor.getMarkdown();
                    }
                },
                toolbarItems: [
                    'heading',
                    'bold',
                    'italic',
                    'strike',
                    'divider',
                    'hr',
                    'quote',
                    'divider',
                    'ul',
                    'ol',
                    // 'task',
                    'indent',
                    'outdent',
                    'divider',
                    'table',
                    'image',
                    'link',
                    'divider',
                    'code',
                    'codeblock',
                ],
            });

            /* Override PopupImage Modal */
            jQuery('#editSection .te-tab-section').remove();
            jQuery('#editSection .te-file-type').remove();
            jQuery('#editSection .te-url-type').addClass('te-tab-active');
            jQuery('#editSection .te-image-url-input').hide();

            /* Add Image Selector */
            jQuery('#editSection .te-url-type').append(
                '<div id="api-file-select"></div>'
            );

            /* Fetch Images from Drupal API */
            var fileItems = [];
            jQuery.get('/api/media/image?include=field_media_image&page[limit]=1000', function( data ) {
                
                var files = data.included;
                data.data.forEach(function(item) {

                    // Find media-image => file-file relation
                    var file = jQuery.grep(files, function( element ) {
                        return element.id === item.relationships.field_media_image.data.id;
                    });

                    if (file !== undefined) {
                        fileItems.push({
                            id: item.id,
                            text: item.attributes.name,
                            url: file[0].attributes.url
                        });
                    }
                });

                /* Format Image Selector Item */
                function fileItemFormater(file) {
                    var $fileTemplate = jQuery('<span class="select-file-item"><img width="90" heighy="60" src="'+file.url+'" />'+file.text+'</span>');
                    return $fileTemplate;
                }

                /* Append images to Image Selector */
                jQuery('#api-file-select').select2({
                    placeholder: 'Select Image',
                    width: '100%',
                    data: fileItems,
                    templateResult: fileItemFormater,
                    selectOnClose: true,
                });

                jQuery('#api-file-select').on('select2:select', function (e) {
                    var data = e.params.data;
                    jQuery('#editSection .te-image-url-input').val(data.url);
                    jQuery('#select2-api-file-select-container').html(data.text);
                    jQuery('#select2-api-file-select-container').attr('title', data.text);
                });
            });

            return editor;

        },
        // editormd
        /**
         * Editor detach callback.
         *
         * @param {HTMLElement} element
         *   The element to detach the editor from.
         * @param {string} format
         *   The text format used for the editor.
         * @param {string} trigger
         *   The event trigger for the detach.
         *
         * @return {bool}
         *   Whether the editor was successfully detached.
         */
        detach: function(element, format, trigger) {

        },

        /**
         * Reacts on a change in the editor element.
         *
         * @param {HTMLElement} element
         *   The element where the change occurred.
         * @param {function} callback
         *   Callback called with the value of the editor.
         */
        onChange: function(element, callback) {
            callback();
        }

    };

})(Drupal);
