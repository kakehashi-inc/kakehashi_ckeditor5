import { Command } from 'ckeditor5';

export default class ContainerBlockCommand extends Command {
    refresh() {
        const model = this.editor.model;
        const selection = model.document.selection;
        const firstBlock = selection.getFirstPosition().parent;

        // Check if we're inside or selecting a container block
        let containerBlock = null;
        let element = firstBlock;

        while (element) {
            if (element.is('element') && element.name === 'containerBlock') {
                containerBlock = element;
                break;
            }
            element = element.parent;
        }

        this.isEnabled = true;
        this.value = containerBlock ? {
            width: containerBlock.getAttribute('width'),
            alignment: containerBlock.getAttribute('alignment')
        } : null;
    }

    execute(options = {}) {
        const model = this.editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            if (options.unwrap) {
                // Unwrap container blocks
                const blocks = Array.from(selection.getSelectedBlocks());
                blocks.forEach(block => {
                    if (block.parent && block.parent.name === 'containerBlock') {
                        const container = block.parent;
                        const parent = container.parent;
                        const index = parent.getChildIndex(container);

                        // Move all children out of the container
                        const children = Array.from(container.getChildren());
                        children.forEach((child, childIndex) => {
                            writer.move(writer.createRangeOn(child), parent, index + childIndex);
                        });

                        writer.remove(container);
                    }
                });
            } else {
                // Wrap selected blocks in a container
                const width = options.width || 100;
                const alignment = options.alignment || 'center';

                // Get the first selected block
                const firstPosition = selection.getFirstPosition();
                let block = firstPosition.parent;

                // If we're in a text node, get the parent block
                if (block.is('$text') || !block.is('element')) {
                    block = block.parent;
                }

                // Make sure we have a valid block
                if (!block || !block.parent) {
                    return;
                }

                const parent = block.parent;
                const blockIndex = parent.getChildIndex(block);

                // Create container block
                const containerBlock = writer.createElement('containerBlock', {
                    width,
                    alignment
                });

                // Insert container before the block
                writer.insert(containerBlock, parent, blockIndex);

                // Move the block into the container
                writer.move(writer.createRangeOn(block), containerBlock, 0);

                // Set selection inside the container
                writer.setSelection(containerBlock.getChild(0), 0);
            }
        });
    }

    updateAttributes(options = {}) {
        const model = this.editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            // Find the container block
            let containerBlock = null;
            let element = selection.getFirstPosition().parent;

            while (element) {
                if (element.is('element') && element.name === 'containerBlock') {
                    containerBlock = element;
                    break;
                }
                element = element.parent;
            }

            if (containerBlock) {
                if (options.width !== undefined) {
                    writer.setAttribute('width', options.width, containerBlock);
                }
                if (options.alignment !== undefined) {
                    writer.setAttribute('alignment', options.alignment, containerBlock);
                }
            }
        });
    }
}
