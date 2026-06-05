import { ANCHOR_ID, ANCHOR_BLOCK, ANCHOR_INLINE, ID_PATTERN, STD_BLOCKS, NATIVE_FOCUSABLE } from './constants';

/**
 * Validate an anchor id against MDN rules: required, no whitespace,
 * valid CSS identifier, and unique within the document.
 *
 * @param {module:engine/model/model~Model} model
 * @param {string} id
 * @param {string|null} excludeId Current anchor's id to ignore when checking duplicates.
 * @returns {{ valid: boolean, reason: ('empty'|'whitespace'|'syntax'|'duplicate'|null) }}
 */
export function validateAnchorId(model, id, excludeId = null) {
    if (!id || id.length === 0) {
        return { valid: false, reason: 'empty' };
    }
    if (/\s/.test(id)) {
        return { valid: false, reason: 'whitespace' };
    }
    if (!ID_PATTERN.test(id)) {
        return { valid: false, reason: 'syntax' };
    }

    const used = collectUsedIds(model, excludeId);
    if (used.has(id)) {
        return { valid: false, reason: 'duplicate' };
    }
    return { valid: true, reason: null };
}

/**
 * Collect every id already used in the document: anchor ids (text/block/wrapper)
 * and ids preserved by General HTML Support on any element.
 *
 * @param {module:engine/model/model~Model} model
 * @param {string|null} excludeId Id to drop from the result (the one being edited).
 * @returns {Set<string>}
 */
export function collectUsedIds(model, excludeId = null) {
    const ids = new Set();
    const root = model.document.getRoot();

    if (!root) {
        return ids;
    }

    const range = model.createRangeIn(root);

    for (const { item } of range.getWalker()) {
        // anchorId on text or on a block element (shared attribute name).
        if (item.hasAttribute && item.hasAttribute(ANCHOR_ID)) {
            ids.add(item.getAttribute(ANCHOR_ID));
        }

        // Wrapper elements.
        if (item.is && (item.is('element', ANCHOR_BLOCK) || item.is('element', ANCHOR_INLINE))) {
            const value = item.getAttribute(ANCHOR_ID);
            if (value) {
                ids.add(value);
            }
        }

        // Ids preserved by GHS on other elements (htmlXxxAttributes.attributes.id).
        if (item.is && item.is('element')) {
            for (const [attrName, value] of item.getAttributes()) {
                if (attrName.startsWith('html') && attrName.endsWith('Attributes')) {
                    const gid = value && value.attributes && value.attributes.id;
                    if (gid) {
                        ids.add(gid);
                    }
                }
            }
        }
    }

    if (excludeId != null) {
        ids.delete(excludeId);
    }

    return ids;
}

/**
 * Whether a view tag needs an explicit tabindex="-1" so that a fragment link
 * (href="#id") can move focus onto it. Natively focusable tags are left alone.
 *
 * @param {string} tagName
 * @returns {boolean}
 */
export function needsTabindex(tagName) {
    return !NATIVE_FOCUSABLE.includes(tagName);
}

/**
 * Detect an existing anchor at the current selection.
 *
 * @param {module:engine/model/model~Model} model
 * @returns {{ id: string, kind: ('inlineText'|'stdBlock'|'wrapper'), element: (module:engine/model/element~Element|null) }|null}
 */
export function detectExistingAnchor(model) {
    const selection = model.document.selection;

    // Inline text attribute.
    if (selection.hasAttribute(ANCHOR_ID)) {
        return { id: selection.getAttribute(ANCHOR_ID), kind: 'inlineText', element: null };
    }

    const position = selection.getFirstPosition();
    if (!position) {
        return null;
    }

    // Walk up looking for a wrapper, or a block carrying the attribute.
    let element = position.parent;
    while (element) {
        if (element.is('element', ANCHOR_BLOCK) || element.is('element', ANCHOR_INLINE)) {
            return { id: element.getAttribute(ANCHOR_ID), kind: 'wrapper', element };
        }
        if (element.is('element') && STD_BLOCKS.includes(element.name) && element.hasAttribute(ANCHOR_ID)) {
            return { id: element.getAttribute(ANCHOR_ID), kind: 'stdBlock', element };
        }
        element = element.parent;
    }

    return null;
}

/**
 * Returns true if the block element (or any of its ancestors) is inside a
 * table cell or is a list item (v48 list: paragraph with listItemId attribute).
 *
 * @param {module:engine/model/element~Element} block
 * @returns {boolean}
 */
function isInsideTableOrList(block) {
    // v48 list: listItemId attribute on the block itself.
    if (block.hasAttribute('listItemId')) {
        return true;
    }
    // Table cell: any ancestor named 'tableCell'.
    if (block.findAncestor('tableCell')) {
        return true;
    }
    return false;
}

/**
 * Classify the current selection to decide how to place the anchor.
 *
 * Modes (phase 1 + phase 2 + phase 3):
 *   'disabled'      - collapsed caret, cannot anchor
 *   'inlineText'    - text range within a single block -> anchorId text attribute -> <span>
 *   'stdBlock'      - whole paragraph/heading selected -> anchorId on element -> <h2 id>
 *   'inlineObject'  - single inline object selected (e.g. imageInline) -> anchorInline wrapper
 *   'blockObject'   - single block object/container selected (e.g. imageBlock, table) -> anchorBlock wrapper
 *   'multiBlock'    - selection spans multiple blocks -> anchorBlock wrapper
 *
 * Phase 3 constraint: inside tableCell or list items, prefer inlineText/stdBlock
 * over wrapper modes (divs must not be inserted into cells or list items).
 *
 * @param {module:engine/model/model~Model} model
 * @returns {{ mode: ('disabled'|'inlineText'|'stdBlock'|'inlineObject'|'blockObject'|'multiBlock'), reason: string }}
 */
export function classifySelection(model) {
    const schema = model.schema;
    const selection = model.document.selection;

    // Collapsed selection (caret only): nothing to anchor.
    if (selection.isCollapsed) {
        return { mode: 'disabled', reason: 'collapsed' };
    }

    // --- Single element selected (getSelectedElement returns non-null) ---
    const selectedElement = selection.getSelectedElement();
    if (selectedElement) {
        if (schema.isInline(selectedElement) && schema.isObject(selectedElement)) {
            return { mode: 'inlineObject', reason: selectedElement.name };
        }
        if (
            !schema.isInline(selectedElement) &&
            (schema.isObject(selectedElement) || schema.isBlock(selectedElement))
        ) {
            return { mode: 'blockObject', reason: selectedElement.name };
        }
    }

    const blocks = Array.from(selection.getSelectedBlocks());

    if (blocks.length === 1) {
        const block = blocks[0];

        // Phase 3: inside table cell or list -> restrict to inline/stdBlock.
        if (STD_BLOCKS.includes(block.name) && isWholeBlockSelected(selection, block)) {
            return { mode: 'stdBlock', reason: block.name };
        }
        return { mode: 'inlineText', reason: 'text' };
    }

    // Multiple blocks selected.
    if (blocks.length > 1) {
        // Phase 3: if ALL blocks are in table cells or list items, fall back to inlineText
        // to avoid inserting a div wrapper inside table/list structures.
        const allInTableOrList = blocks.every(b => isInsideTableOrList(b));
        if (allInTableOrList) {
            return { mode: 'inlineText', reason: 'multi-in-table-or-list' };
        }
        return { mode: 'multiBlock', reason: 'multi' };
    }

    return { mode: 'disabled', reason: 'no-blocks' };
}

/**
 * Whether the selection covers the whole block (start to end).
 *
 * @param {module:engine/model/selection~Selection} selection
 * @param {module:engine/model/element~Element} block
 * @returns {boolean}
 */
function isWholeBlockSelected(selection, block) {
    const range = selection.getFirstRange();
    if (!range) {
        return false;
    }
    const startsAtBeginning = range.start.parent === block && range.start.offset === 0;
    const endsAtEnd = range.end.parent === block && range.end.offset === block.maxOffset;
    return startsAtBeginning && endsAtEnd;
}
