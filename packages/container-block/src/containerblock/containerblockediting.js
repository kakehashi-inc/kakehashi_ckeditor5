import { Plugin } from 'ckeditor5';
import ContainerBlockCommand from './containerblockcommand';
import { CONTAINER_BLOCK, ALIGNMENTS } from './constants';

export default class ContainerBlockEditing extends Plugin {

    static get pluginName() {
        return 'ContainerBlockEditing';
    }

    init() {
        this._defineSchema();
        this._defineConverters();

        this.editor.commands.add(CONTAINER_BLOCK, new ContainerBlockCommand(this.editor));
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        schema.register('containerBlock', {
            isObject: false,
            isLimit: false,
            isBlock: true,
            allowWhere: '$block',
            allowContentOf: '$root',
            allowAttributes: ['width', 'alignment']
        });
    }

    _defineConverters() {
        const editor = this.editor;
        const conversion = editor.conversion;

        // Upcast converter
        conversion.for('upcast').elementToElement({
            view: {
                name: 'div',
                classes: 'container-block'
            },
            model: (viewElement, { writer }) => {
                const styleAttr = viewElement.getAttribute('style') || '';
                const widthMatch = styleAttr.match(/width:\s*(\d+)%/);
                const width = widthMatch ? parseInt(widthMatch[1]) : 100;

                const marginLeft = styleAttr.includes('margin-left: 0') ? 'left' :
                                 styleAttr.includes('margin-right: 0') ? 'right' : 'center';

                return writer.createElement('containerBlock', {
                    width,
                    alignment: marginLeft
                });
            }
        });

        // Data downcast converter
        conversion.for('dataDowncast').elementToElement({
            model: 'containerBlock',
            view: (modelElement, { writer }) => {
                const width = modelElement.getAttribute('width') || 100;
                const alignment = modelElement.getAttribute('alignment') || 'center';

                const alignmentConfig = ALIGNMENTS.find(a => a.value === alignment);

                return writer.createContainerElement('div', {
                    class: 'container-block',
                    style: `width: ${width}%; margin-left: ${alignmentConfig.marginLeft}; margin-right: ${alignmentConfig.marginRight};`
                });
            }
        });

        // Editing downcast converter - simple container without widget
        conversion.for('editingDowncast').elementToElement({
            model: 'containerBlock',
            view: (modelElement, { writer }) => {
                const width = modelElement.getAttribute('width') || 100;
                const alignment = modelElement.getAttribute('alignment') || 'center';

                const alignmentConfig = ALIGNMENTS.find(a => a.value === alignment);

                const div = writer.createContainerElement('div', {
                    class: 'container-block',
                    style: `width: ${width}%; margin-left: ${alignmentConfig.marginLeft}; margin-right: ${alignmentConfig.marginRight};`,
                    'data-width': width,
                    'data-alignment': alignment
                });

                // Add resize handle
                const handle = writer.createUIElement('div', {
                    class: 'ck-container-resize-handle'
                }, function(domDocument) {
                    const domElement = this.toDomElement(domDocument);
                    return domElement;
                });

                writer.insert(writer.createPositionAt(div, 'end'), handle);

                return div;
            }
        });

        // Attribute converters for editing view
        conversion.for('editingDowncast').add(dispatcher => {
            dispatcher.on('attribute:width:containerBlock', (evt, data, conversionApi) => {
                const viewWriter = conversionApi.writer;
                const viewElement = conversionApi.mapper.toViewElement(data.item);

                if (!viewElement) {
                    return;
                }

                const width = data.attributeNewValue || 100;
                const alignment = data.item.getAttribute('alignment') || 'center';
                const alignmentConfig = ALIGNMENTS.find(a => a.value === alignment);

                viewWriter.setAttribute('style',
                    `width: ${width}%; margin-left: ${alignmentConfig.marginLeft}; margin-right: ${alignmentConfig.marginRight};`,
                    viewElement
                );
                viewWriter.setAttribute('data-width', width, viewElement);
            });

            dispatcher.on('attribute:alignment:containerBlock', (evt, data, conversionApi) => {
                const viewWriter = conversionApi.writer;
                const viewElement = conversionApi.mapper.toViewElement(data.item);

                if (!viewElement) {
                    return;
                }

                const width = data.item.getAttribute('width') || 100;
                const alignment = data.attributeNewValue || 'center';
                const alignmentConfig = ALIGNMENTS.find(a => a.value === alignment);

                viewWriter.setAttribute('style',
                    `width: ${width}%; margin-left: ${alignmentConfig.marginLeft}; margin-right: ${alignmentConfig.marginRight};`,
                    viewElement
                );
                viewWriter.setAttribute('data-alignment', alignment, viewElement);
            });
        });
    }
}
