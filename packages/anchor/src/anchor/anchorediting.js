import { Plugin } from 'ckeditor5';
import AnchorCommand from './anchorcommand';
import { needsTabindex } from './anchorutils';
import { ANCHOR, ANCHOR_ID, ANCHOR_BLOCK, ANCHOR_INLINE, STD_BLOCKS } from './constants';

// Custom property keys identifying anchor icon UI elements in the editing view.
// Every anchor icon carries ANCHOR_ICON_PROPERTY; the end icon additionally
// carries ANCHOR_ICON_END_PROPERTY so the two can be told apart.
const ANCHOR_ICON_PROPERTY = 'ckAnchorIcon';
const ANCHOR_ICON_END_PROPERTY = 'ckAnchorIconEnd';

export default class AnchorEditing extends Plugin {
    static get pluginName() {
        return 'AnchorEditing';
    }

    init() {
        this._defineSchema();
        this._defineConverters();

        this.editor.commands.add(ANCHOR, new AnchorCommand(this.editor));

        // Remove wrappers that became empty after an edit.
        this.editor.model.document.registerPostFixer(writer => this._removeEmptyWrappers(writer));

        // Register a view post-fixer to maintain anchor icon UI elements.
        // Each unique inline text anchor (ck-anchor span) should display exactly one
        // anchor icon at the leading edge of the anchored run, regardless of how many
        // pieces the CKEditor selection splitting creates.
        this.editor.editing.view.document.registerPostFixer(writer => this._syncAnchorIcons(writer));
    }

    afterInit() {
        // Extend standard block elements (paragraph, heading1-6) to allow anchorId.
        // This is done in afterInit() instead of init() because plugins like Heading
        // register their model elements (heading1-6) during their own init(). If this
        // plugin's init() runs before Heading's init(), schema.isRegistered() would
        // return false for those elements and the extend() call would be silently
        // skipped. afterInit() is guaranteed to run after all plugins have finished
        // their init(), so every element is registered by that point.
        const schema = this.editor.model.schema;
        for (const name of STD_BLOCKS) {
            if (schema.isRegistered(name)) {
                schema.extend(name, { allowAttributes: ANCHOR_ID });
            }
        }
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        // (A) Inline anchor on text -> <span id>.
        schema.extend('$text', { allowAttributes: ANCHOR_ID });

        // Block elements (paragraph, heading1-6) are extended in afterInit() to
        // guarantee that Heading plugin has already registered heading1-6.

        // (C) Block wrapper (div) that can contain blocks (used in later phases).
        schema.register(ANCHOR_BLOCK, {
            inheritAllFrom: '$container',
            allowAttributes: [ANCHOR_ID],
        });

        // (D) Inline wrapper (span) that can contain inline content / inline objects.
        schema.register(ANCHOR_INLINE, {
            isInline: true,
            allowWhere: '$text',
            allowContentOf: '$block',
            allowAttributes: [ANCHOR_ID],
        });
    }

    _defineConverters() {
        const conversion = this.editor.conversion;

        this._defineInlineTextConverters(conversion);
        this._defineBlockAttributeConverters(conversion);
        this._defineWrapperConverters(conversion);
    }

    // --- Method 2: text attribute anchorId -> <span id tabindex> ------------
    _defineInlineTextConverters(conversion) {
        // Downcast: only react when the attribute is on a text node, so block
        // elements carrying anchorId are left to the block converter below.
        // Data output: span with id + tabindex only (no editing-only class).
        conversion.for('dataDowncast').attributeToElement({
            model: ANCHOR_ID,
            view: (id, { writer }, data) => createInlineAnchorSpan(writer, id, data, false),
        });
        // Editing view: same span plus a marker class for visibility.
        conversion.for('editingDowncast').attributeToElement({
            model: ANCHOR_ID,
            view: (id, { writer }, data) => createInlineAnchorSpan(writer, id, data, true),
        });

        // Upcast: <span id="x">text</span> -> text attribute. elementToAttribute
        // consumes the id so GHS does not also capture it.
        conversion.for('upcast').elementToAttribute({
            view: { name: 'span', attributes: { id: /.+/ } },
            model: {
                key: ANCHOR_ID,
                value: viewElement => viewElement.getAttribute('id'),
            },
            converterPriority: 'high',
        });
    }

    // --- Method 3: block element anchorId -> id on that element -------------
    _defineBlockAttributeConverters(conversion) {
        // Downcast applies to both data and editing pipelines.
        conversion.for('downcast').add(dispatcher => {
            dispatcher.on(`attribute:${ANCHOR_ID}`, (evt, data, conversionApi) => {
                const item = data.item;

                // Text is handled by the inline converter.
                if (!item.is || item.is('$text') || item.is('$textProxy')) {
                    return;
                }
                // Wrappers render their own element with the id baked in.
                if (item.is('element', ANCHOR_BLOCK) || item.is('element', ANCHOR_INLINE)) {
                    return;
                }
                if (!conversionApi.consumable.consume(item, evt.name)) {
                    return;
                }

                const viewElement = conversionApi.mapper.toViewElement(item);
                if (!viewElement) {
                    return;
                }

                const writer = conversionApi.writer;
                const newId = data.attributeNewValue;

                if (newId == null || newId === '') {
                    writer.removeAttribute('id', viewElement);
                    writer.removeAttribute('tabindex', viewElement);
                } else {
                    writer.setAttribute('id', newId, viewElement);
                    if (needsTabindex(viewElement.name)) {
                        writer.setAttribute('tabindex', '-1', viewElement);
                    }
                }
            });
        });

        // Upcast: id on a standard block (p, h1-6) -> anchorId.
        //
        // Why a custom dispatcher instead of attributeToAttribute:
        //   attributeToAttribute registers on the generic 'element' event with
        //   priority 'high' (+1000). However the upcast dispatcher fires the
        //   specific 'element:h2' (etc.) event, and at the time the 'high'
        //   listener runs the base element-to-element converter (Heading plugin,
        //   priority 'normal' = 0) has not yet executed, so data.modelRange is
        //   still null and the helper returns early without consuming the 'id'
        //   attribute. GHS's viewToModelBlockAttributeConverter then runs at
        //   priority 'low' (-1000) and finds 'id' still unconsumed, placing it
        //   into htmlH2Attributes instead of anchorId.
        //
        // Fix: register directly on each specific element event at priority
        //   -999 (= 'low' + 1). By that point the base converter has already
        //   run and set data.modelRange. We consume 'id' (and 'tabindex' if
        //   present, to prevent GHS from capturing it) and write anchorId onto
        //   the model element. GHS runs at -1000 and finds 'id' already
        //   consumed, so it does not add it to htmlH2Attributes.
        conversion.for('upcast').add(dispatcher => {
            for (const viewTagName of ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
                dispatcher.on(
                    `element:${viewTagName}`,
                    (evt, data, conversionApi) => {
                        const viewItem = data.viewItem;

                        // id attribute is required.
                        if (!viewItem.hasAttribute('id')) {
                            return;
                        }
                        // base element-to-element converter must have already run.
                        if (!data.modelRange || data.modelRange.isCollapsed) {
                            return;
                        }

                        const id = viewItem.getAttribute('id');
                        if (!id) {
                            return;
                        }

                        // Consume 'id' so GHS does not capture it into htmlXxxAttributes.
                        // If consume fails the id was already taken by another converter.
                        if (!conversionApi.consumable.consume(viewItem, { attributes: ['id'] })) {
                            return;
                        }

                        // Also consume 'tabindex' when present so GHS does not store it
                        // either (GHS does not allow tabindex, but consume defensively).
                        if (viewItem.hasAttribute('tabindex')) {
                            conversionApi.consumable.consume(viewItem, { attributes: ['tabindex'] });
                        }

                        // Set anchorId on every node in the converted range that allows it.
                        for (const node of data.modelRange.getItems({ shallow: true })) {
                            if (conversionApi.schema.checkAttribute(node, ANCHOR_ID)) {
                                if (!node.hasAttribute(ANCHOR_ID)) {
                                    conversionApi.writer.setAttribute(ANCHOR_ID, id, node);
                                }
                            }
                        }
                    },
                    { priority: -999 }
                );
            }
        });
    }

    // --- Methods 4/5/6: wrapper elements (span/div) ------------------------
    _defineWrapperConverters(conversion) {
        // anchorBlock -> <div id tabindex>. editing adds a marker class.
        conversion.for('dataDowncast').elementToElement({
            model: ANCHOR_BLOCK,
            view: (modelElement, { writer }) =>
                writer.createContainerElement('div', {
                    id: modelElement.getAttribute(ANCHOR_ID),
                    tabindex: '-1',
                }),
        });
        conversion.for('editingDowncast').elementToElement({
            model: ANCHOR_BLOCK,
            view: (modelElement, { writer }) =>
                writer.createContainerElement('div', {
                    id: modelElement.getAttribute(ANCHOR_ID),
                    tabindex: '-1',
                    class: 'ck-anchor-block',
                }),
        });

        // anchorInline -> <span id tabindex>.
        conversion.for('dataDowncast').elementToElement({
            model: ANCHOR_INLINE,
            view: (modelElement, { writer }) =>
                writer.createContainerElement('span', {
                    id: modelElement.getAttribute(ANCHOR_ID),
                    tabindex: '-1',
                }),
        });
        conversion.for('editingDowncast').elementToElement({
            model: ANCHOR_INLINE,
            view: (modelElement, { writer }) =>
                writer.createContainerElement('span', {
                    id: modelElement.getAttribute(ANCHOR_ID),
                    tabindex: '-1',
                    class: 'ck-anchor-inline',
                }),
        });

        // Upcast a plain <div id> (no known feature class) into an anchorBlock.
        // Priority 'high' ensures this runs before GHS which would otherwise consume
        // the div element and place the id into htmlDivAttributes.
        conversion.for('upcast').add(dispatcher => {
            dispatcher.on(
                'element:div',
                (evt, data, conversionApi) => {
                    const viewElement = data.viewItem;

                    if (!viewElement.hasAttribute('id')) {
                        return;
                    }
                    // Leave feature divs (grid/container) to their own converters.
                    if (hasKnownFeatureClass(viewElement)) {
                        return;
                    }
                    if (!conversionApi.consumable.test(viewElement, { name: true, attributes: ['id'] })) {
                        return;
                    }

                    const modelElement = conversionApi.writer.createElement(ANCHOR_BLOCK, {
                        [ANCHOR_ID]: viewElement.getAttribute('id'),
                    });

                    if (!conversionApi.safeInsert(modelElement, data.modelCursor)) {
                        return;
                    }

                    conversionApi.consumable.consume(viewElement, { name: true, attributes: ['id'] });
                    // Consume tabindex if present to prevent GHS capturing it.
                    if (viewElement.hasAttribute('tabindex')) {
                        conversionApi.consumable.consume(viewElement, { attributes: ['tabindex'] });
                    }
                    conversionApi.convertChildren(viewElement, modelElement);
                    conversionApi.updateConversionResult(modelElement, data);
                },
                { priority: 'high' }
            );
        });

        // Upcast <span id> that contains an inline object element into anchorInline.
        // Text-only spans are handled by the elementToAttribute converter above (priority 'high').
        // This converter runs at 'highest' priority so it gets a first look at span[id];
        // it only proceeds when the span has at least one child element (inline object).
        // If the span contains only text nodes, this converter does nothing and lets the
        // elementToAttribute converter convert it to a text attribute instead.
        conversion.for('upcast').add(dispatcher => {
            dispatcher.on(
                'element:span',
                (evt, data, conversionApi) => {
                    const viewElement = data.viewItem;

                    if (!viewElement.hasAttribute('id')) {
                        return;
                    }

                    // Check whether the span has at least one child element (i.e. an inline object).
                    // If it only has text children, skip and let elementToAttribute handle it.
                    let hasChildElement = false;
                    for (const child of viewElement.getChildren()) {
                        if (child.is('element')) {
                            hasChildElement = true;
                            break;
                        }
                    }
                    if (!hasChildElement) {
                        return;
                    }

                    if (!conversionApi.consumable.test(viewElement, { name: true, attributes: ['id'] })) {
                        return;
                    }

                    const modelElement = conversionApi.writer.createElement(ANCHOR_INLINE, {
                        [ANCHOR_ID]: viewElement.getAttribute('id'),
                    });

                    if (!conversionApi.safeInsert(modelElement, data.modelCursor)) {
                        return;
                    }

                    conversionApi.consumable.consume(viewElement, { name: true, attributes: ['id'] });
                    conversionApi.convertChildren(viewElement, modelElement);
                    conversionApi.updateConversionResult(modelElement, data);
                },
                { priority: 'highest' }
            );
        });
    }

    _removeEmptyWrappers(writer) {
        let changed = false;
        const root = this.editor.model.document.getRoot();
        if (!root) {
            return changed;
        }
        for (const { item } of writer.createRangeIn(root).getWalker()) {
            if ((item.is('element', ANCHOR_BLOCK) || item.is('element', ANCHOR_INLINE)) && item.isEmpty) {
                writer.remove(item);
                changed = true;
            }
        }
        return changed;
    }

    // Synchronizes anchor icon UI elements in the editing view.
    //
    // Problem: CKEditor splits AttributeElements at the caret position, so a single
    // anchored run (e.g. "brave") may render as multiple sibling spans, each carrying
    // the ck-anchor class. A CSS ::before on every span would show multiple icons.
    //
    // Solution: After every view change, remove all existing icon UI elements, then
    // re-insert exactly one icon element immediately before the first span of each
    // distinct anchor (keyed by the id attribute value). Spans are visited in document
    // order, so the first occurrence found for each id is the leading piece.
    // This must be IDEMPOTENT: a view post-fixer is re-run until it returns false,
    // so it must only report `true` when it actually changed something. Removing
    // and re-inserting every icon on each pass would always report a change and
    // loop forever. Instead we reconcile: keep icons already in the right place,
    // insert only where missing, and remove only the extras.
    _syncAnchorIcons(writer) {
        const viewRoot = this.editor.editing.view.document.getRoot();
        if (!viewRoot) {
            return false;
        }

        // First and last span (in document order) for each distinct anchor id.
        // The start icon goes before the first span, the end icon after the last.
        const firstSpanById = new Map();
        const lastSpanById = new Map();
        // Every icon UI element currently present.
        const allIcons = [];

        for (const { item } of writer.createRangeIn(viewRoot).getWalker({ ignoreElementEnd: true })) {
            if (item.is('uiElement') && item.getCustomProperty(ANCHOR_ICON_PROPERTY)) {
                allIcons.push(item);
                continue;
            }
            if (item.is('attributeElement') && item.hasClass('ck-anchor')) {
                const id = item.getAttribute('id');
                if (id) {
                    if (!firstSpanById.has(id)) {
                        firstSpanById.set(id, item);
                    }
                    lastSpanById.set(id, item);
                }
            }
        }

        const keptIcons = new Set();
        let changed = false;

        // Start icon immediately before each anchor's leading span.
        for (const [, span] of firstSpanById) {
            const prev = span.previousSibling;
            if (isStartIcon(prev)) {
                keptIcons.add(prev);
                continue;
            }
            const iconEl = createAnchorIcon(writer, false);
            writer.insert(writer.createPositionBefore(span), iconEl);
            keptIcons.add(iconEl);
            changed = true;
        }

        // End icon immediately after each anchor's trailing span.
        for (const [, span] of lastSpanById) {
            const next = span.nextSibling;
            if (isEndIcon(next)) {
                keptIcons.add(next);
                continue;
            }
            const iconEl = createAnchorIcon(writer, true);
            writer.insert(writer.createPositionAfter(span), iconEl);
            keptIcons.add(iconEl);
            changed = true;
        }

        // Remove any icon that is not a kept start/end icon of some anchor.
        for (const icon of allIcons) {
            if (!keptIcons.has(icon)) {
                writer.remove(icon);
                changed = true;
            }
        }

        return changed;
    }
}

function isStartIcon(node) {
    return (
        node &&
        node.is('uiElement') &&
        node.getCustomProperty(ANCHOR_ICON_PROPERTY) &&
        !node.getCustomProperty(ANCHOR_ICON_END_PROPERTY)
    );
}

function isEndIcon(node) {
    return node && node.is('uiElement') && node.getCustomProperty(ANCHOR_ICON_END_PROPERTY);
}

function createAnchorIcon(writer, isEnd) {
    const className = isEnd ? 'ck-anchor-icon ck-anchor-icon-end' : 'ck-anchor-icon';
    const iconEl = writer.createUIElement('span', { class: className, 'aria-hidden': 'true' }, function (domDocument) {
        const domEl = this.toDomElement(domDocument);
        domEl.textContent = '⚓';
        return domEl;
    });
    writer.setCustomProperty(ANCHOR_ICON_PROPERTY, true, iconEl);
    if (isEnd) {
        writer.setCustomProperty(ANCHOR_ICON_END_PROPERTY, true, iconEl);
    }
    return iconEl;
}

function createInlineAnchorSpan(writer, id, data, withMarkerClass) {
    if (!data || !data.item) {
        return;
    }
    if (!(data.item.is('$text') || data.item.is('$textProxy'))) {
        return;
    }
    if (id == null || id === '') {
        return;
    }
    const attrs = { id, tabindex: '-1' };
    if (withMarkerClass) {
        attrs.class = 'ck-anchor';
    }
    return writer.createAttributeElement('span', attrs, { priority: 5 });
}

function hasKnownFeatureClass(viewElement) {
    return (
        viewElement.hasClass('ck-grid-row') ||
        viewElement.hasClass('ck-grid-col') ||
        viewElement.hasClass('container-block')
    );
}
