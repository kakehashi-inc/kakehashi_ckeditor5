import { Command } from 'ckeditor5';
import { validateAnchorId, classifySelection, detectExistingAnchor } from './anchorutils';
import { ANCHOR_ID, ANCHOR_BLOCK, ANCHOR_INLINE } from './constants';

export default class AnchorCommand extends Command {
    refresh() {
        const model = this.editor.model;
        const existing = detectExistingAnchor(model);

        // Store the full detection result (including model element reference)
        // in a private field so execute() can use it without serialization issues.
        // The public `value` property only carries JSON-serializable data so that
        // external code (e.g. tests, toolbar state) can safely read it.
        this._existingAnchor = existing;
        this.value = existing ? { id: existing.id, kind: existing.kind } : null;

        if (existing) {
            // Editing an existing anchor is always available.
            this.isEnabled = true;
        } else {
            const { mode } = classifySelection(model);
            this.isEnabled = mode !== 'disabled';
        }
    }

    /**
     * @param {Object} options
     * @param {string} [options.id] The anchor id to insert or update.
     * @param {boolean} [options.remove] Remove the anchor at the selection.
     */
    execute(options = {}) {
        const model = this.editor.model;

        if (options.remove) {
            this._removeAnchor();
            return;
        }

        const id = options.id;
        // Use the private field that holds the full anchor info (including element
        // reference). this.value only has serializable { id, kind } data.
        const existing = this._existingAnchor;
        const result = validateAnchorId(model, id, existing ? existing.id : null);

        if (!result.valid) {
            this._lastError = result.reason;
            return;
        }
        this._lastError = null;

        if (existing) {
            this._updateExistingId(id, existing);
            return;
        }

        const { mode } = classifySelection(model);

        model.change(writer => {
            switch (mode) {
                case 'stdBlock':
                    this._applyStdBlock(writer, id);
                    break;
                case 'inlineObject':
                    this._applyInlineWrapper(writer, id);
                    break;
                case 'blockObject':
                    this._applyBlockWrapper(writer, id, 'selectedElement');
                    break;
                case 'multiBlock':
                    this._applyBlockWrapper(writer, id, 'multiBlock');
                    break;
                case 'inlineText':
                default:
                    this._applyInlineText(writer, id);
                    break;
            }
        });
    }

    _applyInlineText(writer, id) {
        const selection = this.editor.model.document.selection;
        for (const range of selection.getRanges()) {
            writer.setAttribute(ANCHOR_ID, id, range);
        }
    }

    _applyStdBlock(writer, id) {
        const block = this._firstSelectedBlock();
        if (block) {
            writer.setAttribute(ANCHOR_ID, id, block);
        }
    }

    /**
     * Wrap the single selected inline object element in an anchorInline wrapper.
     *
     * @param {module:engine/model/writer~Writer} writer
     * @param {string} id
     */
    _applyInlineWrapper(writer, id) {
        const selection = this.editor.model.document.selection;
        const element = selection.getSelectedElement();
        if (!element) {
            return;
        }

        const parent = element.parent;
        const index = parent.getChildIndex(element);

        const wrapper = writer.createElement(ANCHOR_INLINE, { [ANCHOR_ID]: id });
        writer.insert(wrapper, parent, index);
        // Move the selected element into the wrapper.
        writer.move(writer.createRangeOn(element), wrapper, 0);
    }

    /**
     * Wrap block content in an anchorBlock wrapper.
     *
     * When mode is 'selectedElement', wraps the single selected block element.
     * When mode is 'multiBlock', wraps all selected blocks (first to last).
     *
     * @param {module:engine/model/writer~Writer} writer
     * @param {string} id
     * @param {'selectedElement'|'multiBlock'} subMode
     */
    _applyBlockWrapper(writer, id, subMode) {
        const model = this.editor.model;
        const selection = model.document.selection;

        if (subMode === 'selectedElement') {
            const element = selection.getSelectedElement();
            if (!element) {
                return;
            }

            const parent = element.parent;
            const index = parent.getChildIndex(element);

            const wrapper = writer.createElement(ANCHOR_BLOCK, { [ANCHOR_ID]: id });
            writer.insert(wrapper, parent, index);
            writer.move(writer.createRangeOn(element), wrapper, 0);
        } else {
            // multiBlock: wrap all selected blocks.
            const blocks = Array.from(selection.getSelectedBlocks());
            if (blocks.length === 0) {
                return;
            }

            const firstBlock = blocks[0];
            const lastBlock = blocks[blocks.length - 1];
            const parent = firstBlock.parent;
            const insertIndex = parent.getChildIndex(firstBlock);

            const wrapper = writer.createElement(ANCHOR_BLOCK, { [ANCHOR_ID]: id });
            writer.insert(wrapper, parent, insertIndex);

            // Move the range from firstBlock through lastBlock into the wrapper.
            const rangeToMove = writer.createRange(
                writer.createPositionBefore(firstBlock),
                writer.createPositionAfter(lastBlock)
            );
            writer.move(rangeToMove, wrapper, 0);
        }
    }

    _updateExistingId(id, existing) {
        const model = this.editor.model;

        model.change(writer => {
            if (existing.kind === 'inlineText') {
                this._setIdOnMatchingText(writer, existing.id, id);
            } else if (existing.element) {
                writer.setAttribute(ANCHOR_ID, id, existing.element);
            }
        });
    }

    _removeAnchor() {
        const model = this.editor.model;
        // Use the private field that holds the full anchor info (including element reference).
        const existing = this._existingAnchor;
        if (!existing) {
            return;
        }

        model.change(writer => {
            if (existing.kind === 'inlineText') {
                this._removeIdFromMatchingText(writer, existing.id);
            } else if (existing.kind === 'wrapper' && existing.element) {
                this._unwrap(writer, existing.element);
            } else if (existing.element) {
                writer.removeAttribute(ANCHOR_ID, existing.element);
            }
        });
    }

    _unwrap(writer, wrapper) {
        const parent = wrapper.parent;
        const index = parent.getChildIndex(wrapper);
        // Move all children out before the wrapper, then remove it.
        writer.move(writer.createRangeIn(wrapper), parent, index);
        writer.remove(wrapper);
    }

    /**
     * Rewrite the anchorId attribute on the run of text that currently has `oldId`.
     */
    _setIdOnMatchingText(writer, oldId, newId) {
        this._eachMatchingTextRange(oldId, range => writer.setAttribute(ANCHOR_ID, newId, range));
    }

    _removeIdFromMatchingText(writer, oldId) {
        this._eachMatchingTextRange(oldId, range => writer.removeAttribute(ANCHOR_ID, range));
    }

    _eachMatchingTextRange(targetId, callback) {
        const model = this.editor.model;
        const root = model.document.getRoot();
        if (!root) {
            return;
        }

        const ranges = [];
        for (const { item } of model.createRangeIn(root).getWalker()) {
            if (
                (item.is('$textProxy') || item.is('$text')) &&
                item.hasAttribute(ANCHOR_ID) &&
                item.getAttribute(ANCHOR_ID) === targetId
            ) {
                ranges.push(model.createRangeOn(item));
            }
        }
        ranges.forEach(callback);
    }

    _firstSelectedBlock() {
        const selection = this.editor.model.document.selection;
        const blocks = Array.from(selection.getSelectedBlocks());
        if (blocks.length > 0) {
            return blocks[0];
        }
        const position = selection.getFirstPosition();
        return position ? position.parent : null;
    }
}
